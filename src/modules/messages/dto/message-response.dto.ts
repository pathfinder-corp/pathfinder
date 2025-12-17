import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { MessageAttachment, ThreadType } from '../entities/message.entity'

export class MessageSenderDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  firstName: string

  @ApiProperty()
  @Expose()
  lastName: string

  @ApiPropertyOptional()
  @Expose()
  avatar?: string
}

export class AttachmentResponseDto {
  @ApiProperty()
  @Expose()
  filename: string

  @ApiProperty()
  @Expose()
  mimeType: string

  @ApiProperty()
  @Expose()
  size: number
}

export class MessageResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty({ enum: ThreadType })
  @Expose()
  threadType: ThreadType

  @ApiProperty()
  @Expose()
  threadId: string

  @ApiProperty()
  @Expose()
  senderId: string

  @ApiPropertyOptional({ type: MessageSenderDto })
  @Expose()
  @Type(() => MessageSenderDto)
  sender?: MessageSenderDto

  @ApiProperty()
  @Expose()
  content: string

  @ApiPropertyOptional({ type: [AttachmentResponseDto] })
  @Expose()
  @Type(() => AttachmentResponseDto)
  attachments?: AttachmentResponseDto[]

  @ApiProperty()
  @Expose()
  isRead: boolean

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  readAt?: Date

  @ApiProperty()
  @Expose()
  isSystemMessage: boolean

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date
}

export class MessageListResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  @Type(() => MessageResponseDto)
  messages: MessageResponseDto[]

  @ApiProperty()
  total: number

  @ApiProperty()
  unreadCount: number
}
