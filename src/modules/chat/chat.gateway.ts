import { Logger, UseGuards } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

import type { AuthenticatedSocket } from './guards/ws-auth.guard'

import { ChatService } from './chat.service'
import {
  GetOnlineStatusDto,
  JoinThreadDto,
  LeaveThreadDto,
  MarkReadDto,
  MessageReadEvent,
  NewMessageEvent,
  PresenceUpdateEvent,
  SendMessageDto,
  SocketEvents,
  TypingDto,
  UserTypingEvent
} from './dto/socket-events.dto'
import { WsAuthGuard } from './guards/ws-auth.guard'
import { ConnectionManagerService } from './services/connection-manager.service'
import { PresenceService } from './services/presence.service'

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true
  },
  namespace: '/chat'
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ChatGateway.name)

  constructor(
    private readonly chatService: ChatService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly presenceService: PresenceService,
    private readonly wsAuthGuard: WsAuthGuard
  ) {}

  afterInit(): void {
    this.logger.log('Chat WebSocket Gateway initialized')
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = await this.wsAuthGuard.validateToken(client)
      ;(client as AuthenticatedSocket).user = user

      this.connectionManager.addConnection(client.id, user.id)

      this.logger.log(`Client connected: ${client.id} (User: ${user.id})`)

      // Broadcast presence update to interested users
      await this.broadcastPresenceUpdate(user.id, true)
    } catch (error) {
      this.logger.warn(`Connection rejected: ${client.id} - ${error}`)
      client.emit(SocketEvents.ERROR, {
        code: 'UNAUTHORIZED',
        message: 'Authentication failed'
      })
      client.disconnect()
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = this.connectionManager.removeConnection(client.id)

    if (userId) {
      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`)

      // Update last seen if user is completely offline
      if (!this.connectionManager.isUserOnline(userId)) {
        this.presenceService.updateLastSeen(userId)
        await this.broadcastPresenceUpdate(userId, false)
      }
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SocketEvents.JOIN_THREAD)
  async handleJoinThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinThreadDto
  ): Promise<{ success: boolean; room: string }> {
    try {
      const room = await this.chatService.validateAndGetThreadRoom(
        dto.threadType,
        dto.threadId,
        client.user.id,
        client.user.role
      )

      await client.join(room)
      this.logger.debug(`User ${client.user.id} joined room ${room}`)

      return { success: true, room }
    } catch (error) {
      throw new WsException(
        error instanceof Error ? error.message : 'Failed to join thread'
      )
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SocketEvents.LEAVE_THREAD)
  async handleLeaveThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: LeaveThreadDto
  ): Promise<{ success: boolean }> {
    const room = `${dto.threadType}:${dto.threadId}`
    await client.leave(room)
    this.logger.debug(`User ${client.user.id} left room ${room}`)

    return { success: true }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SocketEvents.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendMessageDto
  ): Promise<NewMessageEvent> {
    try {
      // Validate participation
      const isParticipant = await this.chatService.checkParticipant(
        dto.threadType,
        dto.threadId,
        client.user.id,
        client.user.role
      )

      if (!isParticipant) {
        throw new WsException('You are not a participant of this conversation')
      }

      const { message, recipientIds } = await this.chatService.sendMessage(
        client.user.id,
        dto
      )

      const room = `${dto.threadType}:${dto.threadId}`
      const newMessageEvent: NewMessageEvent = {
        id: message.id,
        threadType: message.threadType,
        threadId: message.threadId,
        senderId: message.senderId,
        sender: message.sender
          ? {
              id: message.sender.id,
              firstName: message.sender.firstName,
              lastName: message.sender.lastName,
              avatar: message.sender.avatar
            }
          : undefined,
        content: message.content,
        attachments: message.attachments,
        isRead: message.isRead,
        isSystemMessage: message.isSystemMessage,
        createdAt: message.createdAt
      }

      // Broadcast to room (excluding sender)
      client.to(room).emit(SocketEvents.NEW_MESSAGE, newMessageEvent)

      // Also send to recipient's other connections that might not be in the room
      for (const recipientId of recipientIds) {
        if (recipientId !== client.user.id) {
          const recipientSockets =
            this.connectionManager.getUserSockets(recipientId)
          for (const socketId of recipientSockets) {
            if (socketId !== client.id) {
              this.server.to(socketId).emit(SocketEvents.NEW_MESSAGE, {
                ...newMessageEvent,
                _notInRoom: true // Client can use this to know they should refresh
              })
            }
          }
        }
      }

      return newMessageEvent
    } catch (error) {
      this.logger.error(`Send message error: ${error}`)
      throw new WsException(
        error instanceof Error ? error.message : 'Failed to send message'
      )
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SocketEvents.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: TypingDto
  ): void {
    const room = `${dto.threadType}:${dto.threadId}`

    const typingEvent: UserTypingEvent = {
      threadType: dto.threadType,
      threadId: dto.threadId,
      userId: client.user.id,
      isTyping: true
    }

    client.to(room).emit(SocketEvents.USER_TYPING, typingEvent)
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SocketEvents.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: TypingDto
  ): void {
    const room = `${dto.threadType}:${dto.threadId}`

    const typingEvent: UserTypingEvent = {
      threadType: dto.threadType,
      threadId: dto.threadId,
      userId: client.user.id,
      isTyping: false
    }

    client.to(room).emit(SocketEvents.USER_TYPING, typingEvent)
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SocketEvents.MARK_READ)
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: MarkReadDto
  ): Promise<{ markedCount: number }> {
    const markedCount = await this.chatService.markThreadAsRead(
      dto.threadType,
      dto.threadId,
      client.user.id
    )

    // Notify other participants that messages were read
    const room = `${dto.threadType}:${dto.threadId}`
    const readEvent: MessageReadEvent = {
      threadType: dto.threadType,
      threadId: dto.threadId,
      messageId: dto.messageId,
      readBy: client.user.id,
      readAt: new Date()
    }

    client.to(room).emit(SocketEvents.MESSAGE_READ, readEvent)

    return { markedCount }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage(SocketEvents.GET_ONLINE_STATUS)
  handleGetOnlineStatus(@MessageBody() dto: GetOnlineStatusDto): {
    statuses: Array<{ userId: string; isOnline: boolean }>
  } {
    const presences = this.presenceService.getMultiplePresence(dto.userIds)

    return {
      statuses: presences.map((p) => ({
        userId: p.userId,
        isOnline: p.isOnline
      }))
    }
  }

  private async broadcastPresenceUpdate(
    userId: string,
    isOnline: boolean
  ): Promise<void> {
    const interestedSockets =
      await this.presenceService.getInterestedSockets(userId)

    if (interestedSockets.length === 0) return

    const presenceEvent: PresenceUpdateEvent = {
      userId,
      isOnline,
      lastSeen: isOnline ? undefined : new Date()
    }

    for (const socketId of interestedSockets) {
      this.server.to(socketId).emit(SocketEvents.PRESENCE_UPDATE, presenceEvent)
    }

    this.logger.debug(
      `Broadcast presence update for ${userId} to ${interestedSockets.length} sockets`
    )
  }

  // Public method to emit messages from other services
  emitToRoom(room: string, event: string, data: unknown): void {
    this.server.to(room).emit(event, data)
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    const sockets = this.connectionManager.getUserSockets(userId)
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, data)
    }
  }
}
