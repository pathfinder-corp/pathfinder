import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from 'class-validator'

import { ContactType } from '../entities/contact-message.entity'

export class CreateContactDto {
  @ApiProperty({ description: 'Sender name', minLength: 2, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string

  @ApiProperty({ description: 'Sender email' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string

  @ApiPropertyOptional({ description: 'Message subject', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string

  @ApiProperty({
    description: 'Message content',
    minLength: 10,
    maxLength: 5000
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  message: string

  @ApiPropertyOptional({
    description: 'Contact type',
    enum: ContactType,
    default: ContactType.GENERAL
  })
  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType
}