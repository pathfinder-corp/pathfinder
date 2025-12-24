import type { Response } from 'express'

import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { InjectRepository } from '@nestjs/typeorm'
import { plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { AuditLog } from '../../../common/entities/audit-log.entity'
import { AuditLogService } from '../../../common/services/audit-log.service'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { AdminApplicationResponseDto } from '../../mentor-applications/dto/application-response.dto'
import {
  AdminDocumentResponseDto,
  DocumentResponseDto
} from '../../mentor-applications/dto/document-response.dto'
import { ReviewApplicationDto } from '../../mentor-applications/dto/review-application.dto'
import { VerifyDocumentDto } from '../../mentor-applications/dto/upload-document.dto'
import { MentorApplicationsService } from '../../mentor-applications/mentor-applications.service'
import { DocumentUploadService } from '../../mentor-applications/services/document-upload.service'
import {
  MentorListResponseDto,
  MentorProfileResponseDto
} from '../../mentor-profiles/dto/mentor-profile-response.dto'
import { MentorProfilesService } from '../../mentor-profiles/mentor-profiles.service'
import { MentorshipResponseDto } from '../../mentorships/dto/mentorship-response.dto'
import { MentorshipsService } from '../../mentorships/mentorships.service'
import { NotificationType } from '../../notifications/entities/notification.entity'
import { NotificationsService } from '../../notifications/notifications.service'
import { User, UserRole } from '../../users/entities/user.entity'
import { UsersService } from '../../users/users.service'
import {
  AdminForceEndMentorshipDto,
  AdminListApplicationsQueryDto,
  AdminListAuditLogsQueryDto,
  AdminListDocumentsQueryDto,
  AdminListMentorshipsQueryDto,
  AdminListMentorsQueryDto,
  AdminRevokeMentorDto
} from '../dto/admin-mentorship.dto'

@ApiTags('Admin - Mentorship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminMentorshipController {
  constructor(
    private readonly applicationsService: MentorApplicationsService,
    private readonly mentorProfilesService: MentorProfilesService,
    private readonly mentorshipsService: MentorshipsService,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
    private readonly documentUploadService: DocumentUploadService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>
  ) {}

  // ===============================
  // Mentor Applications
  // ===============================

  @Get('mentor-applications')
  @ApiOperation({ summary: 'List all mentor applications' })
  @ApiResponse({ status: 200 })
  async listApplications(
    @Query() query: AdminListApplicationsQueryDto
  ): Promise<{
    applications: AdminApplicationResponseDto[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const { applications, total } =
      await this.applicationsService.findAll(query)

    const page = query.page ?? 1
    const limit = query.limit ?? 20

    return {
      applications: applications.map((app) =>
        plainToInstance(AdminApplicationResponseDto, app, {
          excludeExtraneousValues: true
        })
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  @Get('mentor-applications/:id')
  @ApiOperation({ summary: 'Get application details with history' })
  @ApiResponse({ status: 200, type: AdminApplicationResponseDto })
  async getApplication(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<AdminApplicationResponseDto> {
    const application = await this.applicationsService.findOne(id)

    return plainToInstance(AdminApplicationResponseDto, application, {
      excludeExtraneousValues: true
    })
  }

  @Post('mentor-applications/:id/review')
  @ApiOperation({ summary: 'Review (approve/decline) an application' })
  @ApiResponse({ status: 200, type: AdminApplicationResponseDto })
  async reviewApplication(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewApplicationDto
  ): Promise<AdminApplicationResponseDto> {
    const application = await this.applicationsService.review(id, admin.id, dto)

    return plainToInstance(AdminApplicationResponseDto, application, {
      excludeExtraneousValues: true
    })
  }

  @Post('mentor-applications/:id/under-review')
  @ApiOperation({ summary: 'Mark application as under review' })
  @ApiResponse({ status: 200, type: AdminApplicationResponseDto })
  async markUnderReview(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<AdminApplicationResponseDto> {
    const application = await this.applicationsService.setUnderReview(
      id,
      admin.id
    )

    return plainToInstance(AdminApplicationResponseDto, application, {
      excludeExtraneousValues: true
    })
  }

  // ===============================
  // Mentor Management
  // ===============================

  @Get('mentors')
  @ApiOperation({ summary: 'List all mentor profiles' })
  @ApiResponse({ status: 200, type: MentorListResponseDto })
  async listMentors(
    @Query() query: AdminListMentorsQueryDto
  ): Promise<MentorListResponseDto> {
    const { mentors, total } = await this.mentorProfilesService.findAllForAdmin(
      {
        isActive: query.isActive,
        isAcceptingStudents: query.isAcceptingStudents,
        search: query.search,
        skip: query.skip,
        take: query.take
      }
    )

    const page = query.page ?? 1
    const limit = query.limit ?? 20

    return {
      mentors: mentors.map((m) =>
        plainToInstance(MentorProfileResponseDto, m, {
          excludeExtraneousValues: true
        })
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  @Get('mentors/stats')
  @ApiOperation({ summary: 'Get mentor statistics' })
  @ApiResponse({ status: 200 })
  async getMentorStats(): Promise<{
    total: number
    active: number
    inactive: number
    acceptingStudents: number
  }> {
    return this.mentorProfilesService.getMentorStats()
  }

  @Get('mentors/:id')
  @ApiOperation({ summary: 'Get mentor profile details' })
  @ApiResponse({ status: 200, type: MentorProfileResponseDto })
  @ApiResponse({ status: 404, description: 'Mentor not found' })
  async getMentorProfile(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<MentorProfileResponseDto> {
    const profile = await this.mentorProfilesService.findById(id)

    return plainToInstance(MentorProfileResponseDto, profile, {
      excludeExtraneousValues: true
    })
  }

  @Post('users/:id/revoke-mentor')
  @ApiOperation({ summary: 'Revoke mentor status from a user' })
  @ApiResponse({ status: 200 })
  async revokeMentor(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: AdminRevokeMentorDto
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findOne(userId)

    if (!user) {
      return { success: false, message: 'User not found' }
    }

    if (user.role !== UserRole.MENTOR) {
      return { success: false, message: 'User is not a mentor' }
    }

    // Update user role back to student
    await this.usersService.update(userId, { role: UserRole.STUDENT } as any)

    // Delete mentor profile when role is revoked
    await this.mentorProfilesService.deleteProfile(userId, admin.id)

    // Log audit
    await this.auditLogService.log({
      actorId: admin.id,
      action: 'mentor_revoked',
      entityType: 'user',
      entityId: userId,
      changes: { reason: dto.reason, previousRole: UserRole.MENTOR }
    })

    // Notify user
    await this.notificationsService.create({
      userId,
      type: NotificationType.APPLICATION_DECLINED,
      title: 'Mentor Status Revoked',
      message: `Your mentor status has been revoked: ${dto.reason}`,
      payload: { reason: dto.reason, adminAction: true }
    })

    return { success: true, message: 'Mentor status revoked successfully' }
  }

  // ===============================
  // Mentorship Management
  // ===============================

  @Get('mentorships')
  @ApiOperation({ summary: 'List all mentorships' })
  @ApiResponse({ status: 200 })
  async listMentorships(@Query() query: AdminListMentorshipsQueryDto): Promise<{
    mentorships: MentorshipResponseDto[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const { mentorships, total } =
      await this.mentorshipsService.findAllForAdmin({
        mentorId: query.mentorId,
        studentId: query.studentId,
        status: query.status,
        skip: query.skip,
        take: query.take
      })

    const page = query.page ?? 1
    const limit = query.limit ?? 20

    return {
      mentorships: mentorships.map((m) =>
        plainToInstance(MentorshipResponseDto, m, {
          excludeExtraneousValues: true
        })
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  @Get('mentorships/stats')
  @ApiOperation({ summary: 'Get mentorship statistics' })
  @ApiResponse({ status: 200 })
  async getMentorshipStats(): Promise<{
    total: number
    active: number
    completed: number
    cancelled: number
  }> {
    return this.mentorshipsService.getMentorshipStats()
  }

  @Get('mentorships/:id')
  @ApiOperation({ summary: 'Get mentorship details' })
  @ApiResponse({ status: 200, type: MentorshipResponseDto })
  @ApiResponse({ status: 404, description: 'Mentorship not found' })
  async getMentorshipDetails(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<MentorshipResponseDto> {
    const mentorship = await this.mentorshipsService.findOne(id)

    return plainToInstance(MentorshipResponseDto, mentorship, {
      excludeExtraneousValues: true
    })
  }

  @Post('mentorships/:id/force-end')
  @ApiOperation({ summary: 'Force end an active mentorship' })
  @ApiResponse({ status: 200, type: MentorshipResponseDto })
  async forceEndMentorship(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminForceEndMentorshipDto
  ): Promise<MentorshipResponseDto> {
    const mentorship = await this.mentorshipsService.forceEnd(
      id,
      admin.id,
      dto.reason
    )

    return plainToInstance(MentorshipResponseDto, mentorship, {
      excludeExtraneousValues: true
    })
  }

  // ===============================
  // Audit Logs
  // ===============================

  @Get('audit-logs')
  @ApiOperation({ summary: 'View audit logs' })
  @ApiResponse({ status: 200 })
  async listAuditLogs(@Query() query: AdminListAuditLogsQueryDto): Promise<{
    logs: AuditLog[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const { entityType, entityId, actorId } = query

    const qb = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')

    if (entityType) {
      qb.andWhere('log.entity_type = :entityType', { entityType })
    }

    if (entityId) {
      qb.andWhere('log.entity_id = :entityId', { entityId })
    }

    if (actorId) {
      qb.andWhere('log.actor_id = :actorId', { actorId })
    }

    const [logs, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    const page = query.page ?? 1
    const limit = query.limit ?? 50

    return {
      logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  @Get('applications/flagged')
  @ApiOperation({ summary: 'List all flagged mentor applications' })
  @ApiResponse({ status: 200, type: [AdminApplicationResponseDto] })
  async getFlaggedApplications(): Promise<AdminApplicationResponseDto[]> {
    const applications =
      await this.applicationsService.findFlaggedApplications()

    return applications.map((app) =>
      plainToInstance(AdminApplicationResponseDto, app, {
        excludeExtraneousValues: true
      })
    )
  }

  @Post('applications/:id/unflag')
  @ApiOperation({ summary: 'Manually unflag an application' })
  @ApiResponse({ status: 200, type: AdminApplicationResponseDto })
  @ApiResponse({ status: 400, description: 'Application is not flagged' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async unflagApplication(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<AdminApplicationResponseDto> {
    const application = await this.applicationsService.unflagApplication(
      id,
      admin.id
    )

    return plainToInstance(AdminApplicationResponseDto, application, {
      excludeExtraneousValues: true
    })
  }

  @Get('applications/ip-statistics')
  @ApiOperation({
    summary: 'Get IP hash statistics to identify suspicious patterns'
  })
  @ApiResponse({
    status: 200,
    description: 'List of IP hashes with application counts'
  })
  async getIpHashStatistics(): Promise<
    Array<{ ipHash: string; count: number }>
  > {
    return await this.applicationsService.getIpHashStatistics()
  }

  // ===============================
  // Document Verification
  // ===============================

  @Get('documents')
  @ApiOperation({
    summary:
      'Get all documents with filtering by status (pending/verified/rejected)'
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of documents with verification history'
  })
  async getAllDocuments(@Query() query: AdminListDocumentsQueryDto): Promise<{
    documents: AdminDocumentResponseDto[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const result = await this.documentUploadService.getAllDocumentsWithHistory({
      status: query.status,
      page: query.page,
      limit: query.limit
    })

    return {
      documents: result.documents.map((doc) =>
        plainToInstance(AdminDocumentResponseDto, doc, {
          excludeExtraneousValues: true
        })
      ),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    }
  }

  @Get('documents/pending')
  @ApiOperation({
    summary: 'Get all pending documents across all applications (for review)'
  })
  @ApiResponse({ status: 200, type: [AdminDocumentResponseDto] })
  async getAllPendingDocuments(): Promise<AdminDocumentResponseDto[]> {
    const documents = await this.documentUploadService.getAllPendingDocuments()

    return documents.map((doc) =>
      plainToInstance(AdminDocumentResponseDto, doc, {
        excludeExtraneousValues: true
      })
    )
  }

  @Get('mentor-applications/:applicationId/documents')
  @ApiOperation({
    summary: 'Get all documents for an application (admin view)'
  })
  @ApiResponse({ status: 200, type: [DocumentResponseDto] })
  async getApplicationDocuments(
    @Param('applicationId', ParseUUIDPipe) applicationId: string
  ): Promise<DocumentResponseDto[]> {
    const documents =
      await this.documentUploadService.getDocuments(applicationId)

    return documents.map((doc) =>
      plainToInstance(DocumentResponseDto, doc, {
        excludeExtraneousValues: true
      })
    )
  }

  @Get('mentor-applications/:applicationId/documents/:documentId')
  @ApiOperation({ summary: 'Get document details (admin view)' })
  @ApiResponse({ status: 200, type: AdminDocumentResponseDto })
  async getDocumentDetails(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string
  ): Promise<AdminDocumentResponseDto> {
    const document = await this.documentUploadService.getDocument(documentId)

    return plainToInstance(AdminDocumentResponseDto, document, {
      excludeExtraneousValues: true
    })
  }

  @Get('mentor-applications/:applicationId/documents/:documentId/download')
  @ApiOperation({
    summary: 'Download/view a document (redirects to ImageKit URL)'
  })
  @ApiResponse({ status: 302, description: 'Redirect to ImageKit URL' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async downloadDocument(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response
  ): Promise<void> {
    const document = await this.documentUploadService.getDocument(documentId)

    // Verify document belongs to the application
    if (document.applicationId !== applicationId) {
      throw new NotFoundException('Document not found in this application')
    }

    // Redirect to ImageKit URL
    if (document.imagekitUrl) {
      res.redirect(document.imagekitUrl)
      return
    }

    // Fallback: try to get public URL from service
    const publicUrl =
      await this.documentUploadService.getDocumentPublicUrl(documentId)
    if (publicUrl) {
      res.redirect(publicUrl)
      return
    }

    throw new NotFoundException(
      'Document file not available. Please re-upload the document.'
    )
  }

  @Post('mentor-applications/:applicationId/documents/:documentId/verify')
  @ApiOperation({ summary: 'Verify or reject a document' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async verifyDocument(
    @CurrentUser() admin: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: VerifyDocumentDto
  ): Promise<DocumentResponseDto> {
    const document = await this.documentUploadService.verifyDocument(
      documentId,
      admin.id,
      dto
    )

    return plainToInstance(DocumentResponseDto, document, {
      excludeExtraneousValues: true
    })
  }

  @Get('mentor-applications/:applicationId/documents-stats')
  @ApiOperation({ summary: 'Get document statistics for an application' })
  @ApiResponse({ status: 200 })
  async getDocumentStats(
    @Param('applicationId', ParseUUIDPipe) applicationId: string
  ): Promise<{
    total: number
    verified: number
    pending: number
    rejected: number
    byType: Record<string, number>
  }> {
    return await this.documentUploadService.getDocumentStats(applicationId)
  }
}
