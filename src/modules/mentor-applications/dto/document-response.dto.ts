import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Transform, Type } from 'class-transformer'

import {
  DocumentType,
  DocumentVerificationStatus
} from '../entities/application-document.entity'

/**
 * Helper functions for MIME type checking
 */
const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]

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
 * Response DTO for application document
 */
export class DocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  @Expose()
  id: string

  @ApiProperty({ description: 'Application ID this document belongs to' })
  @Expose()
  applicationId: string

  @ApiProperty({
    enum: DocumentType,
    description: 'Type of document'
  })
  @Expose()
  type: DocumentType

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

  @ApiPropertyOptional({ description: 'Title of the document' })
  @Expose()
  title?: string

  @ApiPropertyOptional({ description: 'Description of the document' })
  @Expose()
  description?: string

  @ApiPropertyOptional({ description: 'Year the certificate/award was issued' })
  @Expose()
  issuedYear?: number

  @ApiPropertyOptional({ description: 'Issuing organization' })
  @Expose()
  issuingOrganization?: string

  @ApiProperty({
    enum: DocumentVerificationStatus,
    description: 'Verification status of the document'
  })
  @Expose()
  verificationStatus: DocumentVerificationStatus

  @ApiProperty({ description: 'Display order' })
  @Expose()
  displayOrder: number

  @ApiProperty({ description: 'Upload timestamp' })
  @Expose()
  @Type(() => Date)
  createdAt: Date

  @ApiPropertyOptional({ description: 'URL to download/view the document' })
  @Expose()
  downloadUrl?: string

  @ApiPropertyOptional({ description: 'ImageKit URL for direct access' })
  @Expose()
  imagekitUrl?: string
}

/**
 * Basic user info for admin document view
 */
export class DocumentUploaderDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  firstName: string

  @ApiProperty()
  @Expose()
  lastName: string

  @ApiPropertyOptional()
  @Expose()
  email?: string
}

/**
 * Basic application info for admin document view
 */
export class DocumentApplicationDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  userId: string

  @ApiProperty()
  @Expose()
  status: string
}

/**
 * Extended response for admins with verification details
 */
export class AdminDocumentResponseDto extends DocumentResponseDto {
  @ApiPropertyOptional({ description: 'Notes from verification' })
  @Expose()
  verificationNotes?: string

  @ApiPropertyOptional({ description: 'ID of admin who verified' })
  @Expose()
  verifiedBy?: string

  @ApiPropertyOptional({ description: 'Verification timestamp' })
  @Expose()
  @Type(() => Date)
  verifiedAt?: Date

  @ApiProperty({ description: 'Stored filename (internal use)' })
  @Expose()
  storedFilename: string

  @ApiProperty({ description: 'File path (internal use)' })
  @Expose()
  filePath: string

  @ApiPropertyOptional({
    description: 'User who uploaded the document',
    type: DocumentUploaderDto
  })
  @Expose()
  @Type(() => DocumentUploaderDto)
  uploader?: DocumentUploaderDto

  @ApiPropertyOptional({
    description: 'Application this document belongs to',
    type: DocumentApplicationDto
  })
  @Expose()
  @Type(() => DocumentApplicationDto)
  application?: DocumentApplicationDto
}
