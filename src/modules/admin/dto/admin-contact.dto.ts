import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from 'class-validator'

import {
  ContactStatus,
  ContactType
} from '../../contact/entities/contact-message.entity'
import { PaginationQueryDto } from './pagination.dto'

export class AdminContactQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ContactStatus })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus

  @ApiPropertyOptional({ enum: ContactType })
  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType

  @ApiPropertyOptional({
    description: 'Search by name, email, or message content'
  })
  @IsOptional()
  @IsString()
  search?: string
}

export class UpdateContactStatusDto {
  @ApiProperty({ enum: ContactStatus })
  @IsEnum(ContactStatus)
  @IsNotEmpty()
  status: ContactStatus
}

export class RespondToContactDto {
  @ApiProperty({
    description: 'Admin response message',
    minLength: 1,
    maxLength: 5000
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(5000)
  response: string
}
