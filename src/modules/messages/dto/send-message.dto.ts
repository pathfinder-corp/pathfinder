import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from 'class-validator'

export class AttachmentMetadataDto {
  @ApiProperty({ description: 'Filename', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  filename: string

  @ApiProperty({ description: 'MIME type', example: 'application/pdf' })
  @IsString()
  @MaxLength(100)
  mimeType: string

  @ApiProperty({ description: 'File size in bytes', minimum: 1 })
  @IsInt()
  @Min(1)
  size: number
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    minLength: 1,
    maxLength: 5000
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string

  @ApiPropertyOptional({
    description: 'Attachment metadata (stub - no actual file upload)',
    type: [AttachmentMetadataDto],
    maxItems: 5
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AttachmentMetadataDto)
  attachments?: AttachmentMetadataDto[]
}
