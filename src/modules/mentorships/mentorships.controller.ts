import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  forwardRef
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ChatGateway } from '../chat/gateways/chat.gateway'
import { ChatService } from '../chat/services/chat.service'
import { User } from '../users/entities/user.entity'
import { EndMentorshipDto } from './dto/end-mentorship.dto'
import { ListMentorshipsQueryDto } from './dto/list-mentorships.dto'
import {
  MentorshipListResponseDto,
  MentorshipResponseDto
} from './dto/mentorship-response.dto'
import { MentorshipsService } from './mentorships.service'

@ApiTags('Mentorships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mentorships')
export class MentorshipsController {
  constructor(
    private readonly mentorshipsService: MentorshipsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my mentorships' })
  @ApiResponse({ status: 200, type: MentorshipListResponseDto })
  async getMyMentorships(
    @CurrentUser() user: User,
    @Query() query: ListMentorshipsQueryDto
  ): Promise<MentorshipListResponseDto> {
    const { mentorships, total } = await this.mentorshipsService.findByUser(
      user.id,
      user.role,
      query
    )

    const page = query.page ?? 1
    const limit = query.limit ?? 20

    return {
      mentorships: mentorships.map((m) =>
        plainToInstance(MentorshipResponseDto, m, {
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
  @ApiOperation({ summary: 'Get mentorship by ID' })
  @ApiResponse({ status: 200, type: MentorshipResponseDto })
  @ApiResponse({ status: 404, description: 'Mentorship not found' })
  async getOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<MentorshipResponseDto> {
    const mentorship = await this.mentorshipsService.findOne(id)

    // Verify user is participant
    if (mentorship.mentorId !== user.id && mentorship.studentId !== user.id) {
      throw new Error('Not authorized to view this mentorship')
    }

    return plainToInstance(MentorshipResponseDto, mentorship, {
      excludeExtraneousValues: true
    })
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a mentorship' })
  @ApiResponse({ status: 200, type: MentorshipResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  async end(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndMentorshipDto
  ): Promise<MentorshipResponseDto> {
    const mentorship = await this.mentorshipsService.end(id, user.id, dto)

    try {
      const conversation =
        await this.chatService.getConversationByMentorshipId(id)
      if (conversation) {
        this.chatGateway.server
          .to(`conversation:${conversation.id}`)
          .emit('mentorship:ended', {
            mentorshipId: id,
            status: mentorship.status,
            endReason: mentorship.endReason,
            endedBy: mentorship.endedBy,
            endedAt: mentorship.endedAt
          })
      }
    } catch {
      // Conversation may not exist, ignore error
    }

    return plainToInstance(MentorshipResponseDto, mentorship, {
      excludeExtraneousValues: true
    })
  }
}
