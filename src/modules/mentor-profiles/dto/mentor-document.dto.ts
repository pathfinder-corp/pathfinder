import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Transform, Type } from 'class-transformer'

import { MentorUserDto } from './mentor-profile-response.dto'

/**
 * Helper functions for MIME type checking
 */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const WORD_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const EXCEL_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

const POWERPOINT_MIME_TYPES = [
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]

/**
 * DTO for verified mentor documents displayed on profile
 */
export class MentorDocumentDto {
  @ApiProperty({ description: 'Document ID' })
  @Expose()
  id: string

  @ApiProperty({
    enum: ['certificate', 'award', 'portfolio', 'recommendation', 'other'],
    description: 'Type of document'
  })
  @Expose()
  type: string

  @ApiPropertyOptional({ description: 'Title of the document' })
  @Expose()
  title?: string

  @ApiPropertyOptional({ description: 'Description of the document' })
  @Expose()
  description?: string

  @ApiPropertyOptional({ description: 'Year the certificate/award was issued' })
  @Expose()
  issuedYear?: number

  @ApiPropertyOptional({ description: 'Organization that issued the document' })
  @Expose()
  issuingOrganization?: string

  @ApiProperty({ description: 'Original filename' })
  @Expose()
  originalFilename: string

  @ApiProperty({ description: 'MIME type of the file' })
  @Expose()
  mimeType: string

  @ApiProperty({ description: 'File size in bytes' })
  @Expose()
  fileSize: number

  @ApiProperty({
    description: 'Whether this document is an image (can be previewed)'
  })
  @Expose()
  @Transform(({ obj }: { obj: { mimeType?: string } }) =>
    IMAGE_MIME_TYPES.includes(obj.mimeType ?? '')
  )
  isImage: boolean

  @ApiProperty({ description: 'Whether this document is a PDF' })
  @Expose()
  @Transform(
    ({ obj }: { obj: { mimeType?: string } }) =>
      obj.mimeType === 'application/pdf'
  )
  isPdf: boolean

  @ApiProperty({ description: 'Whether this document is a Word document' })
  @Expose()
  @Transform(({ obj }: { obj: { mimeType?: string } }) =>
    WORD_MIME_TYPES.includes(obj.mimeType ?? '')
  )
  isWord: boolean

  @ApiProperty({ description: 'Whether this document is an Excel spreadsheet' })
  @Expose()
  @Transform(({ obj }: { obj: { mimeType?: string } }) =>
    EXCEL_MIME_TYPES.includes(obj.mimeType ?? '')
  )
  isExcel: boolean

  @ApiProperty({
    description: 'Whether this document is a PowerPoint presentation'
  })
  @Expose()
  @Transform(({ obj }: { obj: { mimeType?: string } }) =>
    POWERPOINT_MIME_TYPES.includes(obj.mimeType ?? '')
  )
  isPowerPoint: boolean

  @ApiProperty({ description: 'Whether this document is an Office document' })
  @Expose()
  @Transform(({ obj }: { obj: { mimeType?: string } }) => {
    const mime = obj.mimeType ?? ''
    return (
      WORD_MIME_TYPES.includes(mime) ||
      EXCEL_MIME_TYPES.includes(mime) ||
      POWERPOINT_MIME_TYPES.includes(mime)
    )
  })
  isOfficeDocument: boolean

  @ApiPropertyOptional({ description: 'ImageKit URL (if stored on cloud)' })
  @Expose()
  imagekitUrl?: string

  @ApiProperty({ description: 'Verification status' })
  @Expose()
  verificationStatus: string

  @ApiProperty({ description: 'Display order' })
  @Expose()
  displayOrder: number

  @ApiProperty({ description: 'Date when verified' })
  @Expose()
  @Type(() => Date)
  verifiedAt?: Date

  @ApiProperty({ description: 'Date uploaded' })
  @Expose()
  @Type(() => Date)
  createdAt: Date
}

/**
 * Extended mentor profile response with documents
 */
export class MentorProfileWithDocumentsDto {
  @ApiProperty({ description: 'Profile ID' })
  @Expose()
  id: string

  @ApiProperty({ description: 'User ID' })
  @Expose()
  userId: string

  @ApiProperty({ type: MentorUserDto, description: 'User information' })
  @Expose()
  @Type(() => MentorUserDto)
  user: MentorUserDto

  @ApiPropertyOptional()
  @Expose()
  headline?: string

  @ApiPropertyOptional()
  @Expose()
  bio?: string

  @ApiProperty({ type: [String] })
  @Expose()
  expertise: string[]

  @ApiProperty({ type: [String] })
  @Expose()
  skills: string[]

  @ApiProperty({ type: [String] })
  @Expose()
  industries: string[]

  @ApiProperty({ type: [String] })
  @Expose()
  languages: string[]

  @ApiPropertyOptional()
  @Expose()
  yearsExperience?: number

  @ApiPropertyOptional()
  @Expose()
  linkedinUrl?: string

  @ApiPropertyOptional()
  @Expose()
  portfolioUrl?: string

  @ApiProperty()
  @Expose()
  isActive: boolean

  @ApiProperty()
  @Expose()
  isAcceptingMentees: boolean

  @ApiPropertyOptional()
  @Expose()
  maxMentees?: number

  @ApiProperty({ type: [MentorDocumentDto], description: 'Verified documents' })
  @Expose()
  @Type(() => MentorDocumentDto)
  documents: MentorDocumentDto[]

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date
}
