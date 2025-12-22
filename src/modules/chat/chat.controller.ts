import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards
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
import { User } from '../users/entities/user.entity'
import {
  ConversationResponseDto,
  EditMessageDto,
  GetMessagesQueryDto,
  MessageListResponseDto,
  MessageResponseDto,
  SendMessageDto
} from './dto/message.dto'
import { ChatGateway } from './gateways/chat.gateway'
import { ChatRedisService } from './services/chat-redis.service'
import { ChatService } from './services/chat.service'

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: ChatRedisService,
    private readonly chatGateway: ChatGateway
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  async getConversations(
    @CurrentUser() user: User
  ): Promise<ConversationResponseDto[]> {
    const conversations = await this.chatService.getUserConversations(user.id)

    return conversations.map((conv) => {
      const dto = plainToInstance(ConversationResponseDto, conv, {
        excludeExtraneousValues: true
      })

      if (conv.mentorship) {
        dto.mentorshipStatus = conv.mentorship.status
      }

      // Add role information to participants
      if (dto.participant1 && conv.mentorship) {
        dto.participant1.role =
          conv.mentorship.mentorId === dto.participant1.id
            ? 'mentor'
            : 'student'
      }
      if (dto.participant2 && conv.mentorship) {
        dto.participant2.role =
          conv.mentorship.mentorId === dto.participant2.id
            ? 'mentor'
            : 'student'
      }

      return dto
    })
  }

  @Get('conversations/mentorship/:mentorshipId')
  @ApiOperation({ summary: 'Get or create conversation for mentorship' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  async getConversationByMentorship(
    @Param('mentorshipId', ParseUUIDPipe) mentorshipId: string
  ): Promise<ConversationResponseDto> {
    const conversation =
      await this.chatService.getOrCreateConversation(mentorshipId)

    const dto = plainToInstance(ConversationResponseDto, conversation, {
      excludeExtraneousValues: true
    })

    if (conversation.mentorship) {
      dto.mentorshipStatus = conversation.mentorship.status
    }

    // Add role information to participants
    if (dto.participant1 && conversation.mentorship) {
      dto.participant1.role =
        conversation.mentorship.mentorId === dto.participant1.id
          ? 'mentor'
          : 'student'
    }
    if (dto.participant2 && conversation.mentorship) {
      dto.participant2.role =
        conversation.mentorship.mentorId === dto.participant2.id
          ? 'mentor'
          : 'student'
    }

    return dto
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages (paginated)' })
  @ApiResponse({ status: 200, type: MessageListResponseDto })
  async getMessages(
    @CurrentUser() user: User,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query() query: GetMessagesQueryDto
  ): Promise<MessageListResponseDto> {
    const isParticipant = await this.chatService.verifyParticipant(
      conversationId,
      user.id
    )

    if (!isParticipant) {
      throw new Error('Not a participant')
    }

    const { messages, hasMore, nextCursor, mentorship } =
      await this.chatService.getMessages(conversationId, query)

    return {
      messages: messages.map((msg) => {
        const dto = plainToInstance(MessageResponseDto, msg, {
          excludeExtraneousValues: true
        })

        // Add role to sender
        if (dto.sender && mentorship) {
          dto.sender.role =
            mentorship.mentorId === dto.sender.id ? 'mentor' : 'student'
        }

        // Add role to parent message sender if exists
        if (dto.parentMessage?.sender && mentorship) {
          dto.parentMessage.sender.role =
            mentorship.mentorId === dto.parentMessage.sender.id
              ? 'mentor'
              : 'student'
        }

        return dto
      }),
      hasMore,
      nextCursor,
      mentorshipStatus: mentorship?.status,
      mentorshipId: mentorship?.id
    }
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  async sendMessage(
    @CurrentUser() user: User,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendMessageDto
  ): Promise<MessageResponseDto> {
    const { message, mentorship } = await this.chatService.sendMessage(
      conversationId,
      user.id,
      dto
    )

    const responseDto = plainToInstance(MessageResponseDto, message, {
      excludeExtraneousValues: true
    })

    // Add role to sender
    if (responseDto.sender && mentorship) {
      responseDto.sender.role =
        mentorship.mentorId === responseDto.sender.id ? 'mentor' : 'student'
    }

    // Add role to parent message sender if exists
    if (responseDto.parentMessage?.sender && mentorship) {
      responseDto.parentMessage.sender.role =
        mentorship.mentorId === responseDto.parentMessage.sender.id
          ? 'mentor'
          : 'student'
    }

    // Emit real-time new message event to conversation room
    this.chatGateway.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', responseDto)

    // Increment unread for other participant
    const otherUserId = await this.chatService.getOtherParticipantId(
      conversationId,
      user.id
    )

    if (otherUserId) {
      const unreadCount = await this.redisService.incrementUnreadCount(
        conversationId,
        otherUserId
      )

      this.chatGateway.server.to(`user:${otherUserId}`).emit('conversation:unread', {
        conversationId,
        count: unreadCount
      })
    }

    return responseDto
  }

  @Put('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async editMessage(
    @CurrentUser() user: User,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: EditMessageDto
  ): Promise<MessageResponseDto> {
    const { message, mentorship } = await this.chatService.editMessage(
      messageId,
      user.id,
      dto
    )

    const responseDto = plainToInstance(MessageResponseDto, message, {
      excludeExtraneousValues: true
    })

    // Add role to sender
    if (responseDto.sender && mentorship) {
      responseDto.sender.role =
        mentorship.mentorId === responseDto.sender.id ? 'mentor' : 'student'
    }

    // Add role to parent message sender if exists
    if (responseDto.parentMessage?.sender && mentorship) {
      responseDto.parentMessage.sender.role =
        mentorship.mentorId === responseDto.parentMessage.sender.id
          ? 'mentor'
          : 'student'
    }

    // Emit real-time edit event to conversation room
    this.chatGateway.server
      .to(`conversation:${message.conversationId}`)
      .emit('message:edited', responseDto)

    return responseDto
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async deleteMessage(
    @CurrentUser() user: User,
    @Param('messageId', ParseUUIDPipe) messageId: string
  ): Promise<MessageResponseDto> {
    const { message, mentorship } = await this.chatService.deleteMessage(
      messageId,
      user.id
    )

    const responseDto = plainToInstance(MessageResponseDto, message, {
      excludeExtraneousValues: true
    })

    // Add role to sender
    if (responseDto.sender && mentorship) {
      responseDto.sender.role =
        mentorship.mentorId === responseDto.sender.id ? 'mentor' : 'student'
    }

    // Add role to parent message sender if exists
    if (responseDto.parentMessage?.sender && mentorship) {
      responseDto.parentMessage.sender.role =
        mentorship.mentorId === responseDto.parentMessage.sender.id
          ? 'mentor'
          : 'student'
    }

    // Emit real-time delete event to conversation room
    this.chatGateway.server
      .to(`conversation:${message.conversationId}`)
      .emit('message:deleted', responseDto)

    return responseDto
  }

  @Get('conversations/:conversationId/unread-count')
  @ApiOperation({ summary: 'Get unread message count' })
  @ApiResponse({ status: 200 })
  async getUnreadCount(
    @CurrentUser() user: User,
    @Param('conversationId', ParseUUIDPipe) conversationId: string
  ): Promise<{ count: number }> {
    const count = await this.redisService.getUnreadCount(
      conversationId,
      user.id
    )

    return { count }
  }
}
