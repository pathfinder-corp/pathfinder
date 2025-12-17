import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { InjectRepository } from '@nestjs/typeorm'
import { plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { MentorApplication } from '../mentor-applications/entities/mentor-application.entity'
import { MentorshipRequest } from '../mentorship-requests/entities/mentorship-request.entity'
import { Mentorship } from '../mentorships/entities/mentorship.entity'
import { User } from '../users/entities/user.entity'
import {
  MessageListResponseDto,
  MessageResponseDto
} from './dto/message-response.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { ThreadType } from './entities/message.entity'
import { ParticipantGuard } from './guards/participant.guard'
import { MessagesService } from './messages.service'

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('threads')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    @InjectRepository(MentorApplication)
    private readonly applicationRepository: Repository<MentorApplication>,
    @InjectRepository(MentorshipRequest)
    private readonly requestRepository: Repository<MentorshipRequest>,
    @InjectRepository(Mentorship)
    private readonly mentorshipRepository: Repository<Mentorship>
  ) {}

  @Get(':threadType/:threadId/messages')
  @UseGuards(ParticipantGuard)
  @ApiOperation({ summary: 'Get messages in a thread' })
  @ApiParam({ name: 'threadType', enum: ThreadType })
  @ApiParam({ name: 'threadId', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, type: MessageListResponseDto })
  async getMessages(
    @Param('threadType', new ParseEnumPipe(ThreadType)) threadType: ThreadType,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number
  ): Promise<MessageListResponseDto> {
    const { messages, total, unreadCount } =
      await this.messagesService.findByThread(threadType, threadId, {
        limit,
        offset
      })

    return {
      messages: messages.map((m) =>
        plainToInstance(MessageResponseDto, m, {
          excludeExtraneousValues: true
        })
      ),
      total,
      unreadCount
    }
  }

  @Post(':threadType/:threadId/messages')
  @UseGuards(ParticipantGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 messages per minute
  @ApiOperation({ summary: 'Send a message in a thread' })
  @ApiParam({ name: 'threadType', enum: ThreadType })
  @ApiParam({ name: 'threadId', type: String })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  async sendMessage(
    @CurrentUser() user: User,
    @Param('threadType', new ParseEnumPipe(ThreadType)) threadType: ThreadType,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Body() dto: SendMessageDto
  ): Promise<MessageResponseDto> {
    // Get recipient IDs based on thread type
    const recipientIds = await this.getThreadParticipants(threadType, threadId)

    const message = await this.messagesService.send(
      user.id,
      threadType,
      threadId,
      dto,
      recipientIds
    )

    return plainToInstance(MessageResponseDto, message, {
      excludeExtraneousValues: true
    })
  }

  @Post(':threadType/:threadId/mark-read')
  @UseGuards(ParticipantGuard)
  @ApiOperation({ summary: 'Mark all messages in thread as read' })
  @ApiParam({ name: 'threadType', enum: ThreadType })
  @ApiParam({ name: 'threadId', type: String })
  @ApiResponse({
    status: 200,
    schema: { properties: { markedCount: { type: 'number' } } }
  })
  async markThreadAsRead(
    @CurrentUser() user: User,
    @Param('threadType', new ParseEnumPipe(ThreadType)) threadType: ThreadType,
    @Param('threadId', ParseUUIDPipe) threadId: string
  ): Promise<{ markedCount: number }> {
    const markedCount = await this.messagesService.markThreadAsRead(
      threadType,
      threadId,
      user.id
    )

    return { markedCount }
  }

  private async getThreadParticipants(
    threadType: ThreadType,
    threadId: string
  ): Promise<string[]> {
    switch (threadType) {
      case ThreadType.APPLICATION: {
        const application = await this.applicationRepository.findOne({
          where: { id: threadId }
        })
        // Application threads include the applicant (admins see via admin endpoints)
        return application ? [application.userId] : []
      }

      case ThreadType.REQUEST: {
        const request = await this.requestRepository.findOne({
          where: { id: threadId }
        })
        return request ? [request.studentId, request.mentorId] : []
      }

      case ThreadType.MENTORSHIP: {
        const mentorship = await this.mentorshipRepository.findOne({
          where: { id: threadId }
        })
        return mentorship ? [mentorship.studentId, mentorship.mentorId] : []
      }

      default:
        return []
    }
  }
}
