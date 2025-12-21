import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import * as crypto from 'crypto'
import { Repository } from 'typeorm'

import { AuditLogService } from '../../../common/services/audit-log.service'
import { ImageKitService } from '../../../common/services/imagekit.service'
import {
  UpdateDocumentDto,
  UploadDocumentDto,
  VerifyDocumentDto
} from '../dto/upload-document.dto'
import {
  ApplicationDocument,
  DocumentType,
  DocumentVerificationStatus
} from '../entities/application-document.entity'
import { ApplicationStatus } from '../entities/application-status.enum'
import { MentorApplication } from '../entities/mentor-application.entity'

/**
 * Allowed MIME types for document upload
 */
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // PDF
  'application/pdf',
  // Microsoft Word
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  // Microsoft Excel
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  // Microsoft PowerPoint
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  // OpenDocument formats
  'application/vnd.oasis.opendocument.text', // .odt
  'application/vnd.oasis.opendocument.spreadsheet', // .ods
  'application/vnd.oasis.opendocument.presentation' // .odp
]

/**
 * File extension mapping for MIME types
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  // Images
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  // PDF
  'application/pdf': '.pdf',
  // Microsoft Word
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  // Microsoft Excel
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  // Microsoft PowerPoint
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
  // OpenDocument formats
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',
  'application/vnd.oasis.opendocument.presentation': '.odp'
}

export interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  buffer: Buffer
  size: number
}

@Injectable()
export class DocumentUploadService {
  private readonly logger = new Logger(DocumentUploadService.name)
  private readonly maxFileSize: number
  private readonly maxDocumentsPerApplication: number

  constructor(
    @InjectRepository(ApplicationDocument)
    private readonly documentRepository: Repository<ApplicationDocument>,
    @InjectRepository(MentorApplication)
    private readonly applicationRepository: Repository<MentorApplication>,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly imagekitService: ImageKitService
  ) {
    this.maxFileSize =
      this.configService.get<number>('upload.maxFileSizeBytes') ||
      5 * 1024 * 1024 // 5MB
    this.maxDocumentsPerApplication =
      this.configService.get<number>('upload.maxDocumentsPerApplication') || 10

    // Verify ImageKit is enabled
    if (!this.imagekitService.isEnabled()) {
      this.logger.warn(
        'ImageKit is not enabled. Document uploads will fail. Please configure IMAGEKIT_ENABLED=true and provide credentials.'
      )
    }
  }

  /**
   * Upload a document for a mentor application
   */
  async uploadDocument(
    applicationId: string,
    userId: string,
    file: UploadedFile,
    dto: UploadDocumentDto
  ): Promise<ApplicationDocument> {
    // Validate application exists and belongs to user
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['documents']
    })

    if (!application) {
      throw new NotFoundException('Application not found')
    }

    if (application.userId !== userId) {
      throw new ForbiddenException(
        'You can only upload documents to your own application'
      )
    }

    // Can only upload to pending or under_review applications
    if (
      application.status !== ApplicationStatus.PENDING &&
      application.status !== ApplicationStatus.UNDER_REVIEW &&
      application.status !== ApplicationStatus.FLAGGED
    ) {
      throw new BadRequestException(
        `Cannot upload documents to application with status: ${application.status}`
      )
    }

    // Check document limit
    const existingCount = application.documents?.length || 0
    if (existingCount >= this.maxDocumentsPerApplication) {
      throw new BadRequestException(
        `Maximum ${this.maxDocumentsPerApplication} documents allowed per application`
      )
    }

    // Validate file
    this.validateFile(file)

    // Ensure ImageKit is enabled
    if (!this.imagekitService.isEnabled()) {
      throw new BadRequestException(
        'Document upload service is not available. Please contact administrator.'
      )
    }

    // Generate unique filename
    const fileExtension = MIME_TO_EXTENSION[file.mimetype] || '.bin'
    const storedFilename = `${crypto.randomUUID()}${fileExtension}`

    // Upload to ImageKit
    const result = await this.imagekitService.upload(
      file.buffer,
      storedFilename,
      {
        folder: `/applications/${applicationId}`,
        tags: [dto.type, applicationId],
        customMetadata: {
          applicationId,
          originalFilename: file.originalname,
          documentType: dto.type
        }
      }
    )

    this.logger.log(`Document uploaded to ImageKit: ${result.url}`)

    // Create document record
    const document = this.documentRepository.create({
      applicationId,
      uploadedBy: userId,
      type: dto.type,
      originalFilename: file.originalname,
      storedFilename,
      mimeType: file.mimetype,
      fileSize: file.size,
      imagekitFileId: result.fileId,
      imagekitUrl: result.url,
      imagekitPath: result.filePath,
      title: dto.title,
      description: dto.description,
      issuedYear: dto.issuedYear,
      issuingOrganization: dto.issuingOrganization,
      displayOrder: existingCount
    })

    const saved = await this.documentRepository.save(document)

    // Audit log
    await this.auditLogService.log({
      actorId: userId,
      action: 'document_uploaded',
      entityType: 'application_document',
      entityId: saved.id,
      changes: {
        applicationId,
        type: dto.type,
        filename: file.originalname,
        size: file.size,
        imagekitUrl: result.url
      }
    })

    this.logger.log(
      `Document ${saved.id} uploaded for application ${applicationId} by user ${userId}`
    )

    return saved
  }

  /**
   * Get all documents for an application
   */
  async getDocuments(applicationId: string): Promise<ApplicationDocument[]> {
    return this.documentRepository.find({
      where: { applicationId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' }
    })
  }

  /**
   * Get a single document
   */
  async getDocument(documentId: string): Promise<ApplicationDocument> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['application']
    })

    if (!document) {
      throw new NotFoundException('Document not found')
    }

    return document
  }

  /**
   * Get file buffer for download (fetches from ImageKit)
   */
  async getFileBuffer(documentId: string): Promise<{
    buffer: Buffer
    mimeType: string
    filename: string
  }> {
    const document = await this.getDocument(documentId)

    if (!document.imagekitUrl) {
      throw new NotFoundException('Document file not found')
    }

    try {
      const response = await fetch(document.imagekitUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      return {
        buffer,
        mimeType: document.mimeType,
        filename: document.originalFilename
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch from ImageKit: ${document.imagekitUrl}`,
        error
      )
      throw new NotFoundException('Document file not found')
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    documentId: string,
    userId: string,
    dto: UpdateDocumentDto
  ): Promise<ApplicationDocument> {
    const document = await this.getDocument(documentId)

    // Check ownership
    if (document.uploadedBy !== userId) {
      throw new ForbiddenException('You can only update your own documents')
    }

    // Check application status
    if (
      document.application &&
      document.application.status !== ApplicationStatus.PENDING &&
      document.application.status !== ApplicationStatus.UNDER_REVIEW &&
      document.application.status !== ApplicationStatus.FLAGGED
    ) {
      throw new BadRequestException(
        'Cannot update documents for this application'
      )
    }

    // Update fields
    if (dto.type !== undefined) document.type = dto.type
    if (dto.title !== undefined) document.title = dto.title
    if (dto.description !== undefined) document.description = dto.description
    if (dto.issuedYear !== undefined) document.issuedYear = dto.issuedYear
    if (dto.issuingOrganization !== undefined)
      document.issuingOrganization = dto.issuingOrganization
    if (dto.displayOrder !== undefined) document.displayOrder = dto.displayOrder

    const saved = await this.documentRepository.save(document)

    await this.auditLogService.log({
      actorId: userId,
      action: 'document_updated',
      entityType: 'application_document',
      entityId: documentId,
      changes: dto
    })

    return saved
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    const document = await this.getDocument(documentId)

    // Check ownership
    if (document.uploadedBy !== userId) {
      throw new ForbiddenException('You can only delete your own documents')
    }

    // Check application status
    if (
      document.application &&
      document.application.status !== ApplicationStatus.PENDING &&
      document.application.status !== ApplicationStatus.UNDER_REVIEW &&
      document.application.status !== ApplicationStatus.FLAGGED
    ) {
      throw new BadRequestException(
        'Cannot delete documents for this application'
      )
    }

    // Delete file from ImageKit
    if (document.imagekitFileId) {
      try {
        await this.imagekitService.delete(document.imagekitFileId)
        this.logger.log(
          `Deleted file from ImageKit: ${document.imagekitFileId}`
        )
      } catch (error) {
        this.logger.warn(
          `Failed to delete file from ImageKit: ${document.imagekitFileId}`,
          error
        )
      }
    }

    // Delete record
    await this.documentRepository.remove(document)

    await this.auditLogService.log({
      actorId: userId,
      action: 'document_deleted',
      entityType: 'application_document',
      entityId: documentId,
      changes: {
        applicationId: document.applicationId,
        filename: document.originalFilename
      }
    })

    this.logger.log(`Document ${documentId} deleted by user ${userId}`)
  }

  /**
   * Verify or reject a document (admin only)
   */
  async verifyDocument(
    documentId: string,
    adminId: string,
    dto: VerifyDocumentDto
  ): Promise<ApplicationDocument> {
    const document = await this.getDocument(documentId)

    document.verificationStatus = dto.verified
      ? DocumentVerificationStatus.VERIFIED
      : DocumentVerificationStatus.REJECTED
    document.verificationNotes = dto.notes
    document.verifiedBy = adminId
    document.verifiedAt = new Date()

    const saved = await this.documentRepository.save(document)

    await this.auditLogService.log({
      actorId: adminId,
      action: dto.verified ? 'document_verified' : 'document_rejected',
      entityType: 'application_document',
      entityId: documentId,
      changes: {
        verificationStatus: document.verificationStatus,
        notes: dto.notes
      }
    })

    this.logger.log(
      `Document ${documentId} ${dto.verified ? 'verified' : 'rejected'} by admin ${adminId}`
    )

    return saved
  }

  /**
   * Get documents by type for an application
   */
  async getDocumentsByType(
    applicationId: string,
    type: DocumentType
  ): Promise<ApplicationDocument[]> {
    return this.documentRepository.find({
      where: { applicationId, type },
      order: { displayOrder: 'ASC' }
    })
  }

  /**
   * Get document statistics for an application
   */
  async getDocumentStats(applicationId: string): Promise<{
    total: number
    verified: number
    pending: number
    rejected: number
    byType: Record<DocumentType, number>
  }> {
    const documents = await this.getDocuments(applicationId)

    const stats = {
      total: documents.length,
      verified: 0,
      pending: 0,
      rejected: 0,
      byType: {} as Record<DocumentType, number>
    }

    for (const doc of documents) {
      if (doc.verificationStatus === DocumentVerificationStatus.VERIFIED) {
        stats.verified++
      } else if (
        doc.verificationStatus === DocumentVerificationStatus.REJECTED
      ) {
        stats.rejected++
      } else {
        stats.pending++
      }

      stats.byType[doc.type] = (stats.byType[doc.type] || 0) + 1
    }

    return stats
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: UploadedFile): void {
    // Check file exists
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided')
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`
      )
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      )
    }

    // Validate file signature (magic bytes) for additional security
    this.validateFileSignature(file.buffer, file.mimetype)
  }

  /**
   * Validate file signature matches claimed MIME type
   */
  private validateFileSignature(buffer: Buffer, mimeType: string): void {
    // ZIP signature (used by DOCX, XLSX, PPTX, ODT, ODS, ODP)
    const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]

    // OLE2 signature (used by legacy DOC, XLS, PPT)
    const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

    const signatures: Record<string, number[][]> = {
      // Images
      'image/jpeg': [[0xff, 0xd8, 0xff]],
      'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
      'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
      ],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
      // PDF
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
      // Microsoft Office (legacy formats use OLE2)
      'application/msword': [OLE2_SIGNATURE],
      'application/vnd.ms-excel': [OLE2_SIGNATURE],
      'application/vnd.ms-powerpoint': [OLE2_SIGNATURE],
      // Microsoft Office (modern formats use ZIP/OOXML)
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        [ZIP_SIGNATURE],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        ZIP_SIGNATURE
      ],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        [ZIP_SIGNATURE],
      // OpenDocument formats (also ZIP-based)
      'application/vnd.oasis.opendocument.text': [ZIP_SIGNATURE],
      'application/vnd.oasis.opendocument.spreadsheet': [ZIP_SIGNATURE],
      'application/vnd.oasis.opendocument.presentation': [ZIP_SIGNATURE]
    }

    const expectedSignatures = signatures[mimeType]
    if (!expectedSignatures) return

    const fileHeader = Array.from(buffer.subarray(0, 8))
    const isValid = expectedSignatures.some((sig) =>
      sig.every((byte, index) => fileHeader[index] === byte)
    )

    if (!isValid) {
      throw new BadRequestException(
        'File content does not match the declared file type'
      )
    }
  }

  /**
   * Get all pending documents across all applications (for admin review)
   */
  async getAllPendingDocuments(): Promise<ApplicationDocument[]> {
    return this.documentRepository.find({
      where: {
        verificationStatus: DocumentVerificationStatus.PENDING
      },
      relations: ['application', 'uploader'],
      order: { createdAt: 'DESC' }
    })
  }

  /**
   * Get all documents with history (for admin)
   */
  async getAllDocumentsWithHistory(options?: {
    status?: DocumentVerificationStatus
    page?: number
    limit?: number
  }): Promise<{
    documents: ApplicationDocument[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 50
    const skip = (page - 1) * limit

    const whereClause: Record<string, unknown> = {}
    if (options?.status) {
      whereClause.verificationStatus = options.status
    }

    const [documents, total] = await this.documentRepository.findAndCount({
      where: whereClause,
      relations: ['application', 'uploader', 'verifier'],
      order: { updatedAt: 'DESC' },
      skip,
      take: limit
    })

    return {
      documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get public URL for a verified document
   * Returns ImageKit URL with optimizations
   */
  async getDocumentPublicUrl(documentId: string): Promise<string | null> {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        verificationStatus: DocumentVerificationStatus.VERIFIED
      }
    })

    if (!document) {
      return null
    }

    // Return optimized ImageKit URL
    if (document.imagekitPath) {
      return this.imagekitService.getOptimizedUrl(document.imagekitPath)
    }

    // Fallback to direct URL
    return document.imagekitUrl || null
  }

  /**
   * Get verified document info for public viewing
   */
  async getVerifiedDocument(
    documentId: string
  ): Promise<ApplicationDocument | null> {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        verificationStatus: DocumentVerificationStatus.VERIFIED
      }
    })

    return document
  }

  /**
   * Check if document is an image
   */
  isImageDocument(mimeType: string): boolean {
    return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
      mimeType
    )
  }
}
