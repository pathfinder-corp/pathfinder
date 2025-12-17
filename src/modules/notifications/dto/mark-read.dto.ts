import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator'

export class MarkNotificationsReadDto {
  @ApiPropertyOptional({
    description:
      'Specific notification IDs to mark as read. If empty, marks all as read.',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds?: string[]
}

export class MarkReadResponseDto {
  @ApiProperty()
  @IsBoolean()
  success: boolean

  @ApiProperty()
  markedCount: number
}
