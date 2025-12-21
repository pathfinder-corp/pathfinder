import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength
} from 'class-validator'

import { DocumentType } from '../entities/application-document.entity'

/**
 * DTO for uploading a document with a mentor application
 */
export class UploadDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    description: 'Type of document being uploaded',
    example: DocumentType.CERTIFICATE
  })
  @IsEnum(DocumentType)
  type: DocumentType

  @ApiPropertyOptional({
    description: 'Title or name of the document',
    maxLength: 200,
    example: 'AWS Solutions Architect Certificate'
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string

  @ApiPropertyOptional({
    description: 'Brief description of the document',
    maxLength: 1000,
    example: 'Professional certification for cloud architecture on AWS platform'
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @ApiPropertyOptional({
    description: 'Year the certificate/award was issued',
    example: 2023,
    minimum: 1990
  })
  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(new Date().getFullYear() + 1)
  issuedYear?: number

  @ApiPropertyOptional({
    description: 'Organization that issued the certificate/award',
    maxLength: 255,
    example: 'Amazon Web Services'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingOrganization?: string
}

/**
 * DTO for updating document metadata
 */
export class UpdateDocumentDto {
  @ApiPropertyOptional({
    enum: DocumentType,
    description: 'Type of document'
  })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType

  @ApiPropertyOptional({
    description: 'Title or name of the document',
    maxLength: 200
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string

  @ApiPropertyOptional({
    description: 'Brief description of the document',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @ApiPropertyOptional({
    description: 'Year the certificate/award was issued'
  })
  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(new Date().getFullYear() + 1)
  issuedYear?: number

  @ApiPropertyOptional({
    description: 'Organization that issued the certificate/award',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingOrganization?: string

  @ApiPropertyOptional({
    description: 'Display order for the document',
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number
}

/**
 * DTO for admin to verify/reject a document
 */
export class VerifyDocumentDto {
  @ApiProperty({
    description: 'Whether to verify or reject the document',
    example: true
  })
  @IsBoolean()
  verified: boolean

  @ApiPropertyOptional({
    description: 'Notes about the verification decision',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string
}
