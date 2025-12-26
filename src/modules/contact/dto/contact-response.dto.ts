import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { ContactStatus, ContactType } from '../entities/contact-message.entity'

export class ContactUserDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  email: string

  @ApiProperty()
  @Expose()
  firstName: string

  @ApiProperty()
  @Expose()
  lastName: string

  @ApiPropertyOptional({ description: 'User avatar URL' })
  @Expose()
  avatar?: string
}

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

  @ApiPropertyOptional({
    type: ContactUserDto,
    description: 'User info if userId is provided'
  })
  @Expose()
  @Type(() => ContactUserDto)
  user?: ContactUserDto

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

  @ApiPropertyOptional({
    type: ContactUserDto,
    description: 'Admin user who responded'
  })
  @Expose()
  @Type(() => ContactUserDto)
  respondedByUser?: ContactUserDto

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
