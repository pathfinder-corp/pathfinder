import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { plainToInstance } from 'class-transformer'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ChatGateway } from '../chat/gateways/chat.gateway'
import { ChatService } from '../chat/services/chat.service'
import { User } from '../users/entities/user.entity'
import { CreateMentorshipRequestDto } from './dto/create-request.dto'
import { ListRequestsQueryDto } from './dto/list-requests.dto'
import {
  MentorshipRequestResponseDto,
  RequestListResponseDto
} from './dto/request-response.dto'
import { AcceptRequestDto, DeclineRequestDto } from './dto/respond-request.dto'
import { MentorshipRequestsService } from './mentorship-requests.service'

@ApiTags('Mentorship Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mentorship-requests')
export class MentorshipRequestsController {
  constructor(
    private readonly requestsService: MentorshipRequestsService,
    private readonly chatGateway: ChatGateway,
    private readonly chatService: ChatService
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 requests per hour
  @ApiOperation({ summary: 'Create a mentorship request' })
  @ApiResponse({ status: 201, type: MentorshipRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Mentor not found' })
  @ApiResponse({ status: 409, description: 'Pending request already exists' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateMentorshipRequestDto
  ): Promise<MentorshipRequestResponseDto> {
    const request = await this.requestsService.create(user.id, dto)

    return plainToInstance(MentorshipRequestResponseDto, request, {
      excludeExtraneousValues: true
    })
  }

  @Get()
  @ApiOperation({ summary: 'List my requests' })
  @ApiResponse({ status: 200, type: RequestListResponseDto })
  async getMyRequests(
    @CurrentUser() user: User,
    @Query() query: ListRequestsQueryDto
  ): Promise<RequestListResponseDto> {
    const { requests, total } = await this.requestsService.findByUser(
      user.id,
      user.role,
      query
    )

    const page = query.page ?? 1
    const limit = query.limit ?? 20

    return {
      requests: requests.map((r) =>
        plainToInstance(MentorshipRequestResponseDto, r, {
          excludeExtraneousValues: true
        })
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get request by ID' })
  @ApiResponse({ status: 200, type: MentorshipRequestResponseDto })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<MentorshipRequestResponseDto> {
    const request = await this.requestsService.findOne(id)

    // Verify user is participant
    if (request.studentId !== user.id && request.mentorId !== user.id) {
      throw new Error('Not authorized to view this request')
    }

    return plainToInstance(MentorshipRequestResponseDto, request, {
      excludeExtraneousValues: true
    })
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a request (mentor only)' })
  @ApiResponse({ status: 200, type: MentorshipRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state or slot' })
  @ApiResponse({ status: 403, description: 'Not the mentor' })
  async accept(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptRequestDto
  ): Promise<MentorshipRequestResponseDto> {
    const request = await this.requestsService.accept(id, user.id, dto)

    // Emit real-time event for mentorship started
    try {
      const mentorship = await this.requestsService.getMentorshipFromRequest(
        request.id
      )
      if (mentorship) {
        // Ensure conversation exists and is linked to the new mentorship
        // This will reuse existing conversation if available and update mentorshipId
        const conversation =
          await this.chatService.getOrCreateConversation(mentorship.id)
        
        if (conversation) {
          const eventData = {
            mentorshipId: mentorship.id,
            status: mentorship.status,
            conversationId: conversation.id
          }

          // Emit to conversation room (for users already in conversation)
          this.chatGateway.server
            .to(`conversation:${conversation.id}`)
            .emit('mentorship:started', eventData)

          // Also emit to user rooms to ensure both parties receive the event
          // even if they haven't joined the conversation room yet
          this.chatGateway.server
            .to(`user:${mentorship.mentorId}`)
            .emit('mentorship:started', eventData)
          
          this.chatGateway.server
            .to(`user:${mentorship.studentId}`)
            .emit('mentorship:started', eventData)
        }
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to emit mentorship:started event:', error)
    }

    return plainToInstance(MentorshipRequestResponseDto, request, {
      excludeExtraneousValues: true
    })
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline a request (mentor only)' })
  @ApiResponse({ status: 200, type: MentorshipRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state' })
  @ApiResponse({ status: 403, description: 'Not the mentor' })
  async decline(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeclineRequestDto
  ): Promise<MentorshipRequestResponseDto> {
    const request = await this.requestsService.decline(id, user.id, dto)

    return plainToInstance(MentorshipRequestResponseDto, request, {
      excludeExtraneousValues: true
    })
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a pending request (student only)' })
  @ApiResponse({ status: 204, description: 'Request cancelled' })
  @ApiResponse({ status: 400, description: 'Can only cancel pending requests' })
  @ApiResponse({ status: 403, description: 'Not the student' })
  async cancel(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    await this.requestsService.cancel(id, user.id)
  }
}
