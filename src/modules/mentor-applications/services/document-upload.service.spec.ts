import {
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLogService } from '../../../common/services/audit-log.service'
import {
  ApplicationDocument,
  DocumentType,
  DocumentVerificationStatus
} from '../entities/application-document.entity'
import { ApplicationStatus } from '../entities/application-status.enum'
import { MentorApplication } from '../entities/mentor-application.entity'
import { DocumentUploadService, UploadedFile } from './document-upload.service'

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
    unlink: jest.fn().mockResolvedValue(undefined)
  }
}))

describe('DocumentUploadService', () => {
  let service: DocumentUploadService
  let documentRepository: Repository<ApplicationDocument>
  let applicationRepository: Repository<MentorApplication>
  let auditLogService: AuditLogService

  const mockApplication: MentorApplication = {
    id: 'app-123',
    userId: 'user-123',
    status: ApplicationStatus.PENDING,
    applicationData: {},
    isFlagged: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    documents: []
  } as MentorApplication

  const mockDocument: ApplicationDocument = {
    id: 'doc-123',
    applicationId: 'app-123',
    uploadedBy: 'user-123',
    type: DocumentType.CERTIFICATE,
    originalFilename: 'certificate.pdf',
    storedFilename: 'uuid-cert.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    filePath: 'ab/cd/uuid-cert.pdf',
    title: 'AWS Certificate',
    verificationStatus: DocumentVerificationStatus.PENDING,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  } as ApplicationDocument

  const mockPdfFile: UploadedFile = {
    fieldname: 'file',
    originalname: 'certificate.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
    size: 1024
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentUploadService,
        {
          provide: getRepositoryToken(ApplicationDocument),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn()
          }
        },
        {
          provide: getRepositoryToken(MentorApplication),
          useValue: {
            findOne: jest.fn()
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'upload.documentsPath': './uploads/documents',
                'upload.maxFileSizeBytes': 5 * 1024 * 1024,
                'upload.maxDocumentsPerApplication': 10
              }
              return config[key] ?? defaultValue
            })
          }
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn()
          }
        }
      ]
    }).compile()

    service = module.get<DocumentUploadService>(DocumentUploadService)
    documentRepository = module.get<Repository<ApplicationDocument>>(
      getRepositoryToken(ApplicationDocument)
    )
    applicationRepository = module.get<Repository<MentorApplication>>(
      getRepositoryToken(MentorApplication)
    )
    auditLogService = module.get<AuditLogService>(AuditLogService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('uploadDocument', () => {
    it('should upload a document successfully', async () => {
      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue(mockApplication)
      jest.spyOn(documentRepository, 'create').mockReturnValue(mockDocument)
      jest.spyOn(documentRepository, 'save').mockResolvedValue(mockDocument)

      const result = await service.uploadDocument(
        'app-123',
        'user-123',
        mockPdfFile,
        {
          type: DocumentType.CERTIFICATE,
          title: 'AWS Certificate'
        }
      )

      expect(result).toBeDefined()
      expect(result.type).toBe(DocumentType.CERTIFICATE)
      expect(documentRepository.create).toHaveBeenCalled()
      expect(documentRepository.save).toHaveBeenCalled()
      expect(auditLogService.log).toHaveBeenCalled()
    })

    it('should throw NotFoundException if application not found', async () => {
      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(null)

      await expect(
        service.uploadDocument('app-123', 'user-123', mockPdfFile, {
          type: DocumentType.CERTIFICATE
        })
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user does not own application', async () => {
      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue({ ...mockApplication, userId: 'other-user' })

      await expect(
        service.uploadDocument('app-123', 'user-123', mockPdfFile, {
          type: DocumentType.CERTIFICATE
        })
      ).rejects.toThrow(ForbiddenException)
    })

    it('should throw BadRequestException if application is not pending', async () => {
      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.APPROVED
      })

      await expect(
        service.uploadDocument('app-123', 'user-123', mockPdfFile, {
          type: DocumentType.CERTIFICATE
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException if max documents exceeded', async () => {
      const appWithMaxDocs = {
        ...mockApplication,
        documents: Array(10).fill(mockDocument)
      }
      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue(appWithMaxDocs)

      await expect(
        service.uploadDocument('app-123', 'user-123', mockPdfFile, {
          type: DocumentType.CERTIFICATE
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException for invalid MIME type', async () => {
      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue(mockApplication)

      const invalidFile: UploadedFile = {
        ...mockPdfFile,
        mimetype: 'application/zip',
        buffer: Buffer.from('invalid')
      }

      await expect(
        service.uploadDocument('app-123', 'user-123', invalidFile, {
          type: DocumentType.CERTIFICATE
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException if file too large', async () => {
      jest
        .spyOn(applicationRepository, 'findOne')
        .mockResolvedValue(mockApplication)

      const largeFile: UploadedFile = {
        ...mockPdfFile,
        size: 10 * 1024 * 1024 // 10MB
      }

      await expect(
        service.uploadDocument('app-123', 'user-123', largeFile, {
          type: DocumentType.CERTIFICATE
        })
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('getDocuments', () => {
    it('should return documents for an application', async () => {
      jest.spyOn(documentRepository, 'find').mockResolvedValue([mockDocument])

      const result = await service.getDocuments('app-123')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('doc-123')
    })
  })

  describe('getDocument', () => {
    it('should return a single document', async () => {
      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(mockDocument)

      const result = await service.getDocument('doc-123')

      expect(result.id).toBe('doc-123')
    })

    it('should throw NotFoundException if document not found', async () => {
      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(null)

      await expect(service.getDocument('doc-123')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('updateDocument', () => {
    it('should update document metadata', async () => {
      const docWithApp = {
        ...mockDocument,
        application: mockApplication
      }
      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(docWithApp)
      jest
        .spyOn(documentRepository, 'save')
        .mockResolvedValue({ ...docWithApp, title: 'Updated Title' })

      const result = await service.updateDocument('doc-123', 'user-123', {
        title: 'Updated Title'
      })

      expect(documentRepository.save).toHaveBeenCalled()
    })

    it('should throw ForbiddenException if user does not own document', async () => {
      jest.spyOn(documentRepository, 'findOne').mockResolvedValue({
        ...mockDocument,
        uploadedBy: 'other-user',
        application: mockApplication
      })

      await expect(
        service.updateDocument('doc-123', 'user-123', { title: 'New' })
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      const docWithApp = {
        ...mockDocument,
        application: mockApplication
      }
      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(docWithApp)
      jest.spyOn(documentRepository, 'remove').mockResolvedValue(docWithApp)

      await service.deleteDocument('doc-123', 'user-123')

      expect(documentRepository.remove).toHaveBeenCalled()
      expect(auditLogService.log).toHaveBeenCalled()
    })

    it('should throw ForbiddenException if user does not own document', async () => {
      jest.spyOn(documentRepository, 'findOne').mockResolvedValue({
        ...mockDocument,
        uploadedBy: 'other-user',
        application: mockApplication
      })

      await expect(
        service.deleteDocument('doc-123', 'user-123')
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('verifyDocument', () => {
    it('should verify a document', async () => {
      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(mockDocument)
      jest.spyOn(documentRepository, 'save').mockResolvedValue({
        ...mockDocument,
        verificationStatus: DocumentVerificationStatus.VERIFIED
      })

      const result = await service.verifyDocument('doc-123', 'admin-123', {
        verified: true,
        notes: 'Verified successfully'
      })

      expect(documentRepository.save).toHaveBeenCalled()
    })

    it('should reject a document', async () => {
      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(mockDocument)
      jest.spyOn(documentRepository, 'save').mockResolvedValue({
        ...mockDocument,
        verificationStatus: DocumentVerificationStatus.REJECTED
      })

      const result = await service.verifyDocument('doc-123', 'admin-123', {
        verified: false,
        notes: 'Invalid document'
      })

      expect(documentRepository.save).toHaveBeenCalled()
    })
  })

  describe('getDocumentStats', () => {
    it('should return document statistics', async () => {
      const docs = [
        {
          ...mockDocument,
          verificationStatus: DocumentVerificationStatus.VERIFIED
        },
        {
          ...mockDocument,
          id: 'doc-2',
          verificationStatus: DocumentVerificationStatus.PENDING
        },
        {
          ...mockDocument,
          id: 'doc-3',
          verificationStatus: DocumentVerificationStatus.REJECTED
        }
      ]
      jest.spyOn(documentRepository, 'find').mockResolvedValue(docs as any)

      const stats = await service.getDocumentStats('app-123')

      expect(stats.total).toBe(3)
      expect(stats.verified).toBe(1)
      expect(stats.pending).toBe(1)
      expect(stats.rejected).toBe(1)
    })
  })
})
