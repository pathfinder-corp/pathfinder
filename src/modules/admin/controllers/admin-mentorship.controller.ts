import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { ReviewApplicationDto } from '../../mentor-applications/dto/review-application.dto'
import { MentorApplicationsService } from '../../mentor-applications/mentor-applications.service'
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

    // Deactivate mentor profile
    await this.mentorProfilesService.deactivateProfile(userId, admin.id)

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
}
