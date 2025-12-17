import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { NotificationType } from '../entities/notification.entity'

export class NotificationResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty({ enum: NotificationType })
  @Expose()
  type: NotificationType

  @ApiProperty()
  @Expose()
  title: string

  @ApiPropertyOptional()
  @Expose()
  message?: string

  @ApiPropertyOptional()
  @Expose()
  payload?: Record<string, any>

  @ApiProperty()
  @Expose()
  isRead: boolean

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  readAt?: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  @Expose()
  @Type(() => NotificationResponseDto)
  notifications: NotificationResponseDto[]

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 100,
      page: 1,
      limit: 50,
      totalPages: 2
    }
  })
  @Expose()
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }

  @ApiProperty()
  @Expose()
  unreadCount: number
}
