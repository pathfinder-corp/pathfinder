import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { ThreadType } from '../../messages/entities/message.entity'

export class ConversationParticipantDto {
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

  @ApiProperty()
  @Expose()
  isOnline: boolean
}

export class ConversationResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty({ enum: ThreadType })
  @Expose()
  threadType: ThreadType

  @ApiProperty()
  @Expose()
  threadId: string

  @ApiProperty({ type: ConversationParticipantDto })
  @Expose()
  @Type(() => ConversationParticipantDto)
  participant: ConversationParticipantDto

  @ApiPropertyOptional()
  @Expose()
  lastMessagePreview?: string

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  lastMessageAt?: Date

  @ApiProperty()
  @Expose()
  unreadCount: number

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date
}

export class ConversationListResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  @Type(() => ConversationResponseDto)
  conversations: ConversationResponseDto[]

  @ApiProperty()
  total: number

  @ApiProperty()
  totalUnread: number
}
