import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from 'class-validator'

import { ThreadType } from '../../messages/entities/message.entity'

// Client to Server Events

export class JoinThreadDto {
  @IsEnum(ThreadType)
  threadType: ThreadType

  @IsUUID()
  threadId: string
}

export class LeaveThreadDto {
  @IsEnum(ThreadType)
  threadType: ThreadType

  @IsUUID()
  threadId: string
}

export class SendMessageDto {
  @IsEnum(ThreadType)
  threadType: ThreadType

  @IsUUID()
  threadId: string

  @IsString()
  @MaxLength(5000)
  content: string
}

export class TypingDto {
  @IsEnum(ThreadType)
  threadType: ThreadType

  @IsUUID()
  threadId: string
}

export class MarkReadDto {
  @IsEnum(ThreadType)
  threadType: ThreadType

  @IsUUID()
  threadId: string

  @IsOptional()
  @IsUUID()
  messageId?: string
}

export class GetOnlineStatusDto {
  @IsUUID('4', { each: true })
  userIds: string[]
}

// Server to Client Events

export interface NewMessageEvent {
  id: string
  threadType: ThreadType
  threadId: string
  senderId: string
  sender?: {
    id: string
    firstName: string
    lastName: string
    avatar?: string
  }
  content: string
  attachments?: Array<{
    filename: string
    mimeType: string
    size: number
  }>
  isRead: boolean
  isSystemMessage: boolean
  createdAt: Date
}

export interface MessageReadEvent {
  threadType: ThreadType
  threadId: string
  messageId?: string
  readBy: string
  readAt: Date
}

export interface UserTypingEvent {
  threadType: ThreadType
  threadId: string
  userId: string
  isTyping: boolean
}

export interface PresenceUpdateEvent {
  userId: string
  isOnline: boolean
  lastSeen?: Date
}

export interface SocketErrorEvent {
  code: string
  message: string
}

// Socket event names
export enum SocketEvents {
  // Client to Server
  JOIN_THREAD = 'join_thread',
  LEAVE_THREAD = 'leave_thread',
  SEND_MESSAGE = 'send_message',
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',
  MARK_READ = 'mark_read',
  GET_ONLINE_STATUS = 'get_online_status',

  // Server to Client
  NEW_MESSAGE = 'new_message',
  MESSAGE_READ = 'message_read',
  USER_TYPING = 'user_typing',
  PRESENCE_UPDATE = 'presence_update',
  ONLINE_STATUS = 'online_status',
  ERROR = 'error'
}
