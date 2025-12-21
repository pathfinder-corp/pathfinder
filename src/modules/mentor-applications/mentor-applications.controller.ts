import type { Response } from 'express'

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { plainToInstance } from 'class-transformer'
import { memoryStorage } from 'multer'

import { IpAddress } from '../../common/decorators/ip-address.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User, UserRole } from '../users/entities/user.entity'
import { ApplicationResponseDto } from './dto/application-response.dto'
import { CreateApplicationWithDocumentsDto } from './dto/create-application-with-documents.dto'
import { CreateApplicationDto } from './dto/create-application.dto'
import { DocumentResponseDto } from './dto/document-response.dto'
import { UpdateDocumentDto, UploadDocumentDto } from './dto/upload-document.dto'
import { ApplicationStatus } from './entities/application-status.enum'
import { MentorApplicationsService } from './mentor-applications.service'
import { DocumentUploadService } from './services/document-upload.service'

@ApiTags('Mentor Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mentor-applications')
export class MentorApplicationsController {
  constructor(
    private readonly applicationsService: MentorApplicationsService,
    private readonly documentUploadService: DocumentUploadService
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 604800000 } }) // 5 applications per week
  @ApiOperation({ summary: 'Submit a mentor application (text only)' })
  @ApiResponse({ status: 201, type: ApplicationResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Validation error or cooldown active'
  })
  @ApiResponse({
    status: 403,
    description: 'Email not verified or admin user'
  })
  @ApiResponse({
    status: 409,
    description: 'Pending application exists or already a mentor'
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded'
  })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateApplicationDto,
    @IpAddress() ip: string
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationsService.create(user.id, dto, ip)

    // Ensure documents are loaded (will be empty array for new applications)
    await this.applicationsService.ensureDocumentsLoaded(application)

    return plainToInstance(ApplicationResponseDto, application, {
      excludeExtraneousValues: true
    })
  }

  @Post('with-documents')
  @UseInterceptors(
    FilesInterceptor('documents', 10, { storage: memoryStorage() })
  )
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 5, ttl: 604800000 } }) // 5 applications per week
  @ApiOperation({
    summary: 'Submit a mentor application with documents (all-in-one)'
  })
  @ApiBody({
    description: 'Application data with optional document files',
    schema: {
      type: 'object',
      required: [
        'headline',
        'bio',
        'expertise',
        'skills',
        'languages',
        'yearsExperience',
        'motivation'
      ],
      properties: {
        headline: { type: 'string', minLength: 10, maxLength: 200 },
        bio: { type: 'string', minLength: 50, maxLength: 2000 },
        expertise: {
          type: 'string',
          description: 'JSON array of expertise areas',
          example: '["Software Engineering","Cloud Architecture"]'
        },
        skills: {
          type: 'string',
          description: 'JSON array of skills',
          example: '["TypeScript","Node.js","React"]'
        },
        industries: {
          type: 'string',
          description: 'JSON array of industries (optional)',
          example: '["FinTech","Healthcare"]'
        },
        languages: {
          type: 'string',
          description: 'JSON array of languages',
          example: '["English","Spanish"]'
        },
        yearsExperience: { type: 'integer', minimum: 1, maximum: 50 },
        linkedinUrl: { type: 'string', format: 'uri' },
        portfolioUrl: { type: 'string', format: 'uri' },
        motivation: { type: 'string', minLength: 50, maxLength: 1000 },
        documentsMetadata: {
          type: 'string',
          description:
            'JSON array of document metadata (must match files order)',
          example:
            '[{"type":"certificate","title":"AWS Certificate","issuedYear":2023,"issuingOrganization":"Amazon Web Services"}]'
        },
        documents: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Document files (max 10, each max 5MB)'
        }
      }
    }
  })
  @ApiResponse({ status: 201, type: ApplicationResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Validation error or cooldown active'
  })
  @ApiResponse({
    status: 403,
    description: 'Email not verified or admin user'
  })
  @ApiResponse({
    status: 409,
    description: 'Pending application exists or already a mentor'
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded'
  })
  async createWithDocuments(
    @CurrentUser() user: User,
    @Body() dto: CreateApplicationWithDocumentsDto,
    @UploadedFiles() files: Express.Multer.File[],
    @IpAddress() ip: string
  ): Promise<ApplicationResponseDto> {
    // Step 1: Create application
    const applicationDto: CreateApplicationDto = {
      headline: dto.headline,
      bio: dto.bio,
      expertise: dto.expertise,
      skills: dto.skills,
      industries: dto.industries,
      languages: dto.languages,
      yearsExperience: dto.yearsExperience,
      linkedinUrl: dto.linkedinUrl,
      portfolioUrl: dto.portfolioUrl,
      motivation: dto.motivation
    }

    const application = await this.applicationsService.create(
      user.id,
      applicationDto,
      ip
    )

    // Step 2: Upload documents if provided
    if (files && files.length > 0) {
      const documentsMetadata = dto.documentsMetadata || []

      if (documentsMetadata.length !== files.length) {
        throw new BadRequestException(
          `Documents metadata count (${documentsMetadata.length}) must match files count (${files.length})`
        )
      }

      const uploadedDocs: any[] = []
      const failedDocs: Array<{ filename: string; error: string }> = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const metadata = documentsMetadata[i]

        try {
          const uploadDto: UploadDocumentDto = {
            type: metadata.type,
            title: metadata.title,
            description: metadata.description,
            issuedYear: metadata.issuedYear,
            issuingOrganization: metadata.issuingOrganization
          }

          const document = await this.documentUploadService.uploadDocument(
            application.id,
            user.id,
            {
              fieldname: file.fieldname,
              originalname: file.originalname,
              encoding: file.encoding,
              mimetype: file.mimetype,
              buffer: file.buffer,
              size: file.size
            },
            uploadDto
          )

          uploadedDocs.push(document)
        } catch (error) {
          console.error(`File ${i + 1} upload failed:`, error)
          failedDocs.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Upload failed'
          })
        }
      }

      // Reload application with documents
      const updatedApp = await this.applicationsService.findOne(application.id)

      const response = plainToInstance(ApplicationResponseDto, updatedApp, {
        excludeExtraneousValues: true
      })

      // Add upload summary to response (if any failures)
      if (failedDocs.length > 0) {
        ;(response as any).uploadSummary = {
          total: files.length,
          uploaded: uploadedDocs.length,
          failed: failedDocs.length,
          failures: failedDocs
        }
      }

      return response
    }

    // No documents, return application with empty documents array
    await this.applicationsService.ensureDocumentsLoaded(application)

    return plainToInstance(ApplicationResponseDto, application, {
      excludeExtraneousValues: true
    })
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my applications' })
  @ApiResponse({ status: 200, type: [ApplicationResponseDto] })
  async getMyApplications(
    @CurrentUser() user: User
  ): Promise<ApplicationResponseDto[]> {
    const applications = await this.applicationsService.findByUser(user.id)

    // Documents are already loaded via findByUser (includes 'documents' relation)
    return applications.map((app) => {
      const response = plainToInstance(ApplicationResponseDto, app, {
        excludeExtraneousValues: true
      })
      // Only include decline reason if status is declined
      if (app.status !== ApplicationStatus.DECLINED) {
        delete response.declineReason
      }
      return response
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  @ApiResponse({ status: 200, type: ApplicationResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to view this application'
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationsService.findOne(id)

    // Non-admin users can only view their own applications
    if (user.role !== UserRole.ADMIN && application.userId !== user.id) {
      throw new ForbiddenException('Not authorized to view this application')
    }

    // Documents are already loaded via findOne (includes 'documents' relation)
    const response = plainToInstance(ApplicationResponseDto, application, {
      excludeExtraneousValues: true
    })

    // Hide decline reason from non-owners unless declined
    if (
      application.userId !== user.id ||
      application.status !== ApplicationStatus.DECLINED
    ) {
      delete response.declineReason
    }

    return response
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Withdraw my application' })
  @ApiResponse({ status: 204, description: 'Application withdrawn' })
  @ApiResponse({ status: 400, description: 'Cannot withdraw this application' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async withdraw(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    await this.applicationsService.withdraw(id, user.id)
  }

  // ============================================
  // Document Upload Endpoints
  // ============================================

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a document (certificate, award, portfolio) for application'
  })
  @ApiBody({
    description: 'Document file with metadata',
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image or PDF file (max 5MB)'
        },
        type: {
          type: 'string',
          enum: [
            'certificate',
            'award',
            'portfolio',
            'recommendation',
            'other'
          ],
          description: 'Type of document'
        },
        title: {
          type: 'string',
          maxLength: 200,
          description: 'Title of the document'
        },
        description: {
          type: 'string',
          maxLength: 1000,
          description: 'Description of the document'
        },
        issuedYear: {
          type: 'integer',
          minimum: 1990,
          description: 'Year the certificate/award was issued'
        },
        issuingOrganization: {
          type: 'string',
          maxLength: 255,
          description: 'Organization that issued the document'
        }
      }
    }
  })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file or validation error' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async uploadDocument(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided')
    }

    const document = await this.documentUploadService.uploadDocument(
      applicationId,
      user.id,
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size
      },
      dto
    )

    return plainToInstance(DocumentResponseDto, document, {
      excludeExtraneousValues: true
    })
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get all documents for an application' })
  @ApiResponse({ status: 200, type: [DocumentResponseDto] })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getDocuments(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string
  ): Promise<DocumentResponseDto[]> {
    // Verify access
    const application = await this.applicationsService.findOne(applicationId)
    if (user.role !== UserRole.ADMIN && application.userId !== user.id) {
      throw new ForbiddenException('Not authorized to view documents')
    }

    const documents =
      await this.documentUploadService.getDocuments(applicationId)

    return documents.map((doc) =>
      plainToInstance(DocumentResponseDto, doc, {
        excludeExtraneousValues: true
      })
    )
  }

  @Get(':applicationId/documents/:documentId')
  @ApiOperation({ summary: 'Get a specific document metadata' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string
  ): Promise<DocumentResponseDto> {
    const document = await this.documentUploadService.getDocument(documentId)

    // Verify access
    if (
      user.role !== UserRole.ADMIN &&
      document.application?.userId !== user.id
    ) {
      throw new ForbiddenException('Not authorized to view this document')
    }

    return plainToInstance(DocumentResponseDto, document, {
      excludeExtraneousValues: true
    })
  }

  @Get(':applicationId/documents/:documentId/download')
  @ApiOperation({ summary: 'Download a document file' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async downloadDocument(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response
  ): Promise<void> {
    const document = await this.documentUploadService.getDocument(documentId)

    // Verify access
    if (
      user.role !== UserRole.ADMIN &&
      document.application?.userId !== user.id
    ) {
      throw new ForbiddenException('Not authorized to download this document')
    }

    const { buffer, mimeType, filename } =
      await this.documentUploadService.getFileBuffer(documentId)

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length
    })

    res.send(buffer)
  }

  @Patch(':applicationId/documents/:documentId')
  @ApiOperation({ summary: 'Update document metadata' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async updateDocument(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: UpdateDocumentDto
  ): Promise<DocumentResponseDto> {
    const document = await this.documentUploadService.updateDocument(
      documentId,
      user.id,
      dto
    )

    return plainToInstance(DocumentResponseDto, document, {
      excludeExtraneousValues: true
    })
  }

  @Delete(':applicationId/documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete document' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string
  ): Promise<void> {
    await this.documentUploadService.deleteDocument(documentId, user.id)
  }
}
