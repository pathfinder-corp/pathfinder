import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from 'class-validator'

import { MessageType } from '../entities/message.entity'

export class MessageUserDto {
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

  @ApiPropertyOptional({ enum: ['mentor', 'student'] })
  @Expose()
  role?: 'mentor' | 'student'

  @ApiPropertyOptional({
    description: 'Whether this user is currently online (real-time presence)'
  })
  @Expose()
  isOnline?: boolean
}

export class MessageResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  conversationId: string

  @ApiProperty()
  @Expose()
  senderId: string

  @ApiPropertyOptional({ type: MessageUserDto })
  @Expose()
  @Type(() => MessageUserDto)
  sender?: MessageUserDto

  @ApiProperty({ enum: MessageType })
  @Expose()
  type: MessageType

  @ApiProperty()
  @Expose()
  content: string

  @ApiPropertyOptional()
  @Expose()
  parentMessageId?: string

  @ApiPropertyOptional({ type: MessageResponseDto })
  @Expose()
  @Type(() => MessageResponseDto)
  parentMessage?: MessageResponseDto

  @ApiProperty()
  @Expose()
  isEdited: boolean

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  editedAt?: Date

  @ApiProperty()
  @Expose()
  isDeleted: boolean

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  deletedAt?: Date

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  readAt?: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date

  @ApiPropertyOptional({
    description:
      'URL of attachment (image or file) if this is an attachment message'
  })
  @Expose()
  attachmentUrl?: string

  @ApiPropertyOptional({
    description: 'Thumbnail URL for image attachments'
  })
  @Expose()
  attachmentThumbnailUrl?: string

  @ApiPropertyOptional({
    description: 'Original attachment file name'
  })
  @Expose()
  attachmentFileName?: string

  @ApiPropertyOptional({
    description: 'Attachment MIME type'
  })
  @Expose()
  attachmentMimeType?: string

  @ApiPropertyOptional({
    description: 'Attachment size in bytes'
  })
  @Expose()
  attachmentSize?: number
}

export class SendMessageDto {
  @ApiProperty({ maxLength: 10000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string

  @ApiPropertyOptional({ description: 'ID of message being replied to' })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string
}

export class EditMessageDto {
  @ApiProperty({ maxLength: 10000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50

  @ApiPropertyOptional({
    description: 'Cursor (message ID) to load messages before this point'
  })
  @IsOptional()
  @IsUUID()
  before?: string
}

export class SearchMessagesQueryDto {
  @ApiProperty({
    description: 'Search keyword in message content',
    maxLength: 200
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  q: string

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50

  @ApiPropertyOptional({
    description:
      'Cursor (message ID) to load search results before this message'
  })
  @IsOptional()
  @IsUUID()
  before?: string
}

export class MessageListResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  @Type(() => MessageResponseDto)
  messages: MessageResponseDto[]

  @ApiProperty()
  hasMore: boolean

  @ApiPropertyOptional()
  nextCursor?: string

  @ApiPropertyOptional({ enum: ['active', 'ended', 'cancelled'] })
  mentorshipStatus?: string

  @ApiPropertyOptional()
  mentorshipId?: string

  @ApiPropertyOptional({
    description: 'Reason why mentorship ended'
  })
  mentorshipEndReason?: string

  @ApiPropertyOptional({
    description: 'User ID who ended the mentorship'
  })
  mentorshipEndedBy?: string

  @ApiPropertyOptional({
    description: 'Date when mentorship ended'
  })
  @Type(() => Date)
  mentorshipEndedAt?: Date
}

export class ConversationResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  mentorshipId: string

  @ApiPropertyOptional({
    description: 'Mentor profile ID for navigation to public profile'
  })
  @Expose()
  mentorProfileId?: string

  @ApiPropertyOptional({ enum: ['active', 'ended', 'cancelled'] })
  @Expose()
  mentorshipStatus?: string

  @ApiPropertyOptional({
    description: 'Reason why mentorship ended'
  })
  @Expose()
  mentorshipEndReason?: string

  @ApiPropertyOptional({
    description: 'User ID who ended the mentorship'
  })
  @Expose()
  mentorshipEndedBy?: string

  @ApiPropertyOptional({
    description: 'Date when mentorship ended'
  })
  @Expose()
  @Type(() => Date)
  mentorshipEndedAt?: Date

  @ApiProperty()
  @Expose()
  participant1Id: string

  @ApiPropertyOptional({ type: MessageUserDto })
  @Expose()
  @Type(() => MessageUserDto)
  participant1?: MessageUserDto

  @ApiProperty()
  @Expose()
  participant2Id: string

  @ApiPropertyOptional({ type: MessageUserDto })
  @Expose()
  @Type(() => MessageUserDto)
  participant2?: MessageUserDto

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  lastMessageAt?: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date
}
