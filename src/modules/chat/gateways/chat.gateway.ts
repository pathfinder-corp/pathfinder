import { Logger, UseGuards } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException
} from '@nestjs/websockets'
import { plainToInstance } from 'class-transformer'
import { Server, Socket } from 'socket.io'

import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard'
import { MessageResponseDto, SendMessageDto } from '../dto/message.dto'
import { ChatRedisService } from '../services/chat-redis.service'
import { ChatService } from '../services/chat.service'

interface AuthenticatedSocket extends Socket {
  userId?: string
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },
  namespace: '/chat'
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ChatGateway.name)

  constructor(
    private readonly chatService: ChatService,
    private readonly redisService: ChatRedisService
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '')

      if (!token) {
        throw new WsException('No token provided')
      }

      // For now, assume userId is passed in handshake.auth
      // This will be properly validated by WsJwtGuard
      const userId =
        client.handshake.auth?.userId || client.handshake.headers?.userid

      if (!userId) {
        throw new WsException('Invalid token')
      }

      client.userId = userId
      await this.redisService.setUserOnline(userId, client.id)

      // Join user's personal room
      await client.join(`user:${userId}`)

      // Notify others about online status
      client.broadcast.emit('user:online', { userId })

      this.logger.log(`User ${userId} connected with socket ${client.id}`)
    } catch (error) {
      this.logger.error(`Connection error: ${(error as Error).message}`)
      client.disconnect()
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      await this.redisService.setUserOffline(client.userId, client.id)

      const isStillOnline = await this.redisService.isUserOnline(client.userId)

      if (!isStillOnline) {
        client.broadcast.emit('user:offline', { userId: client.userId })
      }

      this.logger.log(
        `User ${client.userId} disconnected from socket ${client.id}`
      )
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    const { conversationId } = data

    const isParticipant = await this.chatService.verifyParticipant(
      conversationId,
      client.userId!
    )

    if (!isParticipant) {
      throw new WsException('Not a participant of this conversation')
    }

    await client.join(`conversation:${conversationId}`)

    // Get online status of other participant
    const otherUserId = await this.chatService.getOtherParticipantId(
      conversationId,
      client.userId!
    )

    if (otherUserId) {
      const isOnline = await this.redisService.isUserOnline(otherUserId)
      client.emit('user:status', { userId: otherUserId, isOnline })
    }

    this.logger.log(
      `User ${client.userId} joined conversation ${conversationId}`
    )
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    const { conversationId } = data
    await client.leave(`conversation:${conversationId}`)
    await this.redisService.clearTyping(conversationId, client.userId!)

    this.logger.log(`User ${client.userId} left conversation ${conversationId}`)
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; message: SendMessageDto }
  ) {
    const { conversationId, message } = data

    const savedMessage = await this.chatService.sendMessage(
      conversationId,
      client.userId!,
      message
    )

    const messageDto = plainToInstance(MessageResponseDto, savedMessage, {
      excludeExtraneousValues: true
    })

    // Emit to conversation room
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', messageDto)

    // Clear typing indicator
    await this.redisService.clearTyping(conversationId, client.userId!)
    this.server
      .to(`conversation:${conversationId}`)
      .emit('typing:stop', { userId: client.userId })

    // Increment unread for other participant
    const otherUserId = await this.chatService.getOtherParticipantId(
      conversationId,
      client.userId!
    )

    if (otherUserId) {
      const unreadCount = await this.redisService.incrementUnreadCount(
        conversationId,
        otherUserId
      )

      this.server.to(`user:${otherUserId}`).emit('conversation:unread', {
        conversationId,
        count: unreadCount
      })
    }

    return messageDto
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { conversationId: string; messageId: string; content: string }
  ) {
    const { conversationId, messageId, content } = data

    const editedMessage = await this.chatService.editMessage(
      messageId,
      client.userId!,
      { content }
    )

    const messageDto = plainToInstance(MessageResponseDto, editedMessage, {
      excludeExtraneousValues: true
    })

    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:edited', messageDto)

    return messageDto
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string }
  ) {
    const { conversationId, messageId } = data

    const deletedMessage = await this.chatService.deleteMessage(
      messageId,
      client.userId!
    )

    const messageDto = plainToInstance(MessageResponseDto, deletedMessage, {
      excludeExtraneousValues: true
    })

    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:deleted', messageDto)

    return messageDto
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    const { conversationId } = data

    await this.redisService.setTyping(conversationId, client.userId!, 5)

    client.to(`conversation:${conversationId}`).emit('typing:start', {
      userId: client.userId,
      conversationId
    })
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    const { conversationId } = data

    await this.redisService.clearTyping(conversationId, client.userId!)

    client.to(`conversation:${conversationId}`).emit('typing:stop', {
      userId: client.userId,
      conversationId
    })
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('messages:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageIds: string[] }
  ) {
    const { conversationId, messageIds } = data

    await this.chatService.markAsRead(
      conversationId,
      client.userId!,
      messageIds
    )

    await this.redisService.resetUnreadCount(conversationId, client.userId!)

    // Notify sender of read receipts
    this.server.to(`conversation:${conversationId}`).emit('messages:read', {
      conversationId,
      messageIds,
      readBy: client.userId
    })
  }
}
