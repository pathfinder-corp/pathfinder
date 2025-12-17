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
import { ChatRedisService } from './services/chat-redis.service'
import { ChatService } from './services/chat.service'

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: ChatRedisService
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  async getConversations(
    @CurrentUser() user: User
  ): Promise<ConversationResponseDto[]> {
    const conversations = await this.chatService.getUserConversations(user.id)

    return conversations.map((conv) =>
      plainToInstance(ConversationResponseDto, conv, {
        excludeExtraneousValues: true
      })
    )
  }

  @Get('conversations/mentorship/:mentorshipId')
  @ApiOperation({ summary: 'Get or create conversation for mentorship' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  async getConversationByMentorship(
    @Param('mentorshipId', ParseUUIDPipe) mentorshipId: string
  ): Promise<ConversationResponseDto> {
    const conversation =
      await this.chatService.getOrCreateConversation(mentorshipId)

    return plainToInstance(ConversationResponseDto, conversation, {
      excludeExtraneousValues: true
    })
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

    const { messages, hasMore, nextCursor } =
      await this.chatService.getMessages(conversationId, query)

    return {
      messages: messages.map((msg) =>
        plainToInstance(MessageResponseDto, msg, {
          excludeExtraneousValues: true
        })
      ),
      hasMore,
      nextCursor
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
    const message = await this.chatService.sendMessage(
      conversationId,
      user.id,
      dto
    )

    return plainToInstance(MessageResponseDto, message, {
      excludeExtraneousValues: true
    })
  }

  @Put('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async editMessage(
    @CurrentUser() user: User,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: EditMessageDto
  ): Promise<MessageResponseDto> {
    const message = await this.chatService.editMessage(messageId, user.id, dto)

    return plainToInstance(MessageResponseDto, message, {
      excludeExtraneousValues: true
    })
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async deleteMessage(
    @CurrentUser() user: User,
    @Param('messageId', ParseUUIDPipe) messageId: string
  ): Promise<MessageResponseDto> {
    const message = await this.chatService.deleteMessage(messageId, user.id)

    return plainToInstance(MessageResponseDto, message, {
      excludeExtraneousValues: true
    })
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
