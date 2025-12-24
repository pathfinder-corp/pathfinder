import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { ContactStatus, ContactType } from '../entities/contact-message.entity'

export class ContactMessageResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  name: string

  @ApiProperty()
  @Expose()
  email: string

  @ApiPropertyOptional()
  @Expose()
  subject?: string

  @ApiProperty()
  @Expose()
  message: string

  @ApiProperty({ enum: ContactType })
  @Expose()
  type: ContactType

  @ApiPropertyOptional()
  @Expose()
  userId?: string

  @ApiProperty({ enum: ContactStatus })
  @Expose()
  status: ContactStatus

  @ApiPropertyOptional()
  @Expose()
  adminResponse?: string

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  respondedAt?: Date

  @ApiPropertyOptional()
  @Expose()
  respondedBy?: string

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date
}

export class CreateContactResponseDto {
  @ApiProperty()
  @Expose()
  message: string

  @ApiProperty({ type: ContactMessageResponseDto })
  @Expose()
  @Type(() => ContactMessageResponseDto)
  contactMessage: ContactMessageResponseDto
}