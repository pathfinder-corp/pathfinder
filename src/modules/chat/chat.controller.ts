import { Controller, Get, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../users/entities/user.entity'
import { ChatService } from './chat.service'
import { ConversationListResponseDto } from './dto/conversation.dto'

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'Get conversation list',
    description:
      'Returns all conversations for the current user with last message preview and unread counts'
  })
  @ApiResponse({
    status: 200,
    type: ConversationListResponseDto,
    description: 'List of conversations'
  })
  async getConversations(
    @CurrentUser() user: User
  ): Promise<ConversationListResponseDto> {
    return this.chatService.getConversationsForUser(user.id)
  }
}
