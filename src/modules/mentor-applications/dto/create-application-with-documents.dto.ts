import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { plainToInstance, Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from 'class-validator'

import { DocumentType } from '../entities/application-document.entity'

/**
 * Metadata for a document being uploaded with the application
 */
export class DocumentMetadataDto {
  @ApiProperty({
    enum: DocumentType,
    description: 'Type of document',
    example: DocumentType.CERTIFICATE
  })
  @IsEnum(DocumentType)
  type: DocumentType

  @ApiPropertyOptional({
    description: 'Title of the document',
    maxLength: 200,
    example: 'AWS Solutions Architect Certificate'
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string

  @ApiPropertyOptional({
    description: 'Description of the document',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @ApiPropertyOptional({
    description: 'Year the certificate/award was issued',
    minimum: 1990
  })
  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(new Date().getFullYear() + 1)
  issuedYear?: number

  @ApiPropertyOptional({
    description: 'Issuing organization',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingOrganization?: string
}


function transformDocumentsMetadata(value: unknown): DocumentMetadataDto[] | undefined {
  if (!value) return undefined

  let parsed: unknown[]
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return []
    }
  } else if (Array.isArray(value)) {
    parsed = value
  } else {
    return []
  }

  // Convert plain objects to DocumentMetadataDto instances
  return parsed.map((item) => plainToInstance(DocumentMetadataDto, item))
}

/**
 * DTO for creating application with documents in one request
 * Used for multipart/form-data requests
 */
export class CreateApplicationWithDocumentsDto {
  @ApiProperty({ description: 'Professional headline', maxLength: 200 })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  headline: string

  @ApiProperty({ description: 'Bio/introduction', maxLength: 2000 })
  @IsString()
  @MinLength(50)
  @MaxLength(2000)
  bio: string

  @ApiProperty({
    description: 'Areas of expertise (JSON array)',
    type: [String],
    example: ['Software Engineering', 'Cloud Architecture']
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
    return value
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  expertise: string[]

  @ApiProperty({
    description: 'Technical and soft skills (JSON array)',
    type: [String],
    example: ['JavaScript', 'Leadership', 'System Design']
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
    return value
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  skills: string[]

  @ApiPropertyOptional({
    description: 'Industries worked in (JSON array)',
    type: [String],
    example: ['FinTech', 'Healthcare']
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
    return value
  })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  industries?: string[]

  @ApiProperty({
    description: 'Languages spoken (JSON array)',
    type: [String],
    example: ['English', 'Spanish']
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    }
    return value
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  languages: string[]

  @ApiProperty({ description: 'Years of professional experience', minimum: 1 })
  @Transform(({ value }) => {
    if (typeof value === 'string') return parseInt(value, 10)
    return value
  })
  @IsInt()
  @Min(1)
  @Max(50)
  yearsExperience: number

  @ApiPropertyOptional({ description: 'LinkedIn profile URL' })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string

  @ApiPropertyOptional({ description: 'Portfolio or personal website URL' })
  @IsOptional()
  @IsUrl()
  portfolioUrl?: string

  @ApiProperty({
    description: 'Motivation for becoming a mentor',
    maxLength: 1000
  })
  @IsString()
  @MinLength(50)
  @MaxLength(1000)
  motivation: string

  @ApiPropertyOptional({
    description: 'Document metadata (JSON array)',
    type: [DocumentMetadataDto],
    example: [
      {
        type: 'certificate',
        title: 'AWS Solutions Architect',
        issuedYear: 2023,
        issuingOrganization: 'Amazon Web Services'
      }
    ]
  })
  @IsOptional()
  @Transform(({ value }) => transformDocumentsMetadata(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentMetadataDto)
  documentsMetadata?: DocumentMetadataDto[]
}

