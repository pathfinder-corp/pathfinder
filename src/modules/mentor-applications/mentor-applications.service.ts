import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLogService } from '../../common/services/audit-log.service'
import { IpUtil } from '../../common/utils/ip.util'
import { MentorProfilesService } from '../mentor-profiles/mentor-profiles.service'
import { NotificationType } from '../notifications/entities/notification.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { UserRole } from '../users/entities/user.entity'
import { UsersService } from '../users/users.service'
import { CreateApplicationDto } from './dto/create-application.dto'
import { ListApplicationsQueryDto } from './dto/list-applications.dto'
import {
  ReviewApplicationDto,
  ReviewDecision
} from './dto/review-application.dto'
import { ApplicationStatusHistory } from './entities/application-status-history.entity'
import {
  ApplicationStatus,
  MentorApplication
} from './entities/mentor-application.entity'
import { ContentValidatorService } from './services/content-validator.service'

@Injectable()
export class MentorApplicationsService {
  private readonly logger = new Logger(MentorApplicationsService.name)

  constructor(
    @InjectRepository(MentorApplication)
    private readonly applicationRepository: Repository<MentorApplication>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepository: Repository<ApplicationStatusHistory>,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly contentValidatorService: ContentValidatorService,
    private readonly mentorProfilesService: MentorProfilesService
  ) {}

  async create(
    userId: string,
    dto: CreateApplicationDto,
    ipAddress?: string
  ): Promise<MentorApplication> {
    // Check if user already has mentor role
    const user = await this.usersService.findOne(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Administrators cannot apply to be mentors. Admin privileges supersede mentor roles.'
      )
    }

    if (user.role === UserRole.MENTOR) {
      throw new ConflictException('User is already a mentor')
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email address before applying to become a mentor'
      )
    }

    // Check IP-based rate limiting
    if (ipAddress && ipAddress !== 'unknown') {
      const ipHashSalt =
        this.configService.get<string>('ipHashSalt') || 'default-salt'
      const ipHash = IpUtil.hashIp(ipAddress, ipHashSalt)

      const ipBasedLimit = this.configService.get<number>(
        'mentorship.ipBasedRateLimitPerWeek',
        10
      )
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const recentApplicationsFromIp = await this.applicationRepository.count({
        where: {
          ipHash,
          createdAt: weekAgo as any // TypeORM MoreThan would be imported
        }
      })

      if (recentApplicationsFromIp >= ipBasedLimit) {
        this.logger.warn(
          `IP-based rate limit exceeded: ${ipHash} (${recentApplicationsFromIp} applications in last 7 days)`
        )
        throw new BadRequestException(
          'Too many applications from your location. Please try again later.'
        )
      }
    }

    // Validate content quality
    const validationResult =
      this.contentValidatorService.validateApplication(dto)

    // Check for existing pending/under_review application
    const existingPending = await this.applicationRepository.findOne({
      where: {
        userId,
        status: ApplicationStatus.PENDING
      }
    })

    if (existingPending) {
      throw new ConflictException(
        'You already have a pending application. Please wait for it to be reviewed.'
      )
    }

    const existingUnderReview = await this.applicationRepository.findOne({
      where: {
        userId,
        status: ApplicationStatus.UNDER_REVIEW
      }
    })

    if (existingUnderReview) {
      throw new ConflictException('Your application is currently under review.')
    }

    // Check reapply cooldown if previously declined
    const lastDeclined = await this.applicationRepository.findOne({
      where: {
        userId,
        status: ApplicationStatus.DECLINED
      },
      order: { decidedAt: 'DESC' }
    })

    if (lastDeclined?.decidedAt) {
      const cooldownDays =
        this.configService.get<number>('mentorship.reapplyCooldownDays') ?? 30
      const cooldownEnd = new Date(lastDeclined.decidedAt)
      cooldownEnd.setDate(cooldownEnd.getDate() + cooldownDays)

      if (new Date() < cooldownEnd) {
        const daysRemaining = Math.ceil(
          (cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        throw new BadRequestException(
          `You can reapply in ${daysRemaining} day(s). Previous application was declined on ${lastDeclined.decidedAt.toISOString().split('T')[0]}.`
        )
      }
    }

    // Compute IP hash if provided
    let ipHash: string | undefined
    if (ipAddress && ipAddress !== 'unknown') {
      const ipHashSalt =
        this.configService.get<string>('ipHashSalt') || 'default-salt'
      ipHash = IpUtil.hashIp(ipAddress, ipHashSalt)
    }

    // Determine status based on content validation
    const status = validationResult.shouldFlag
      ? ApplicationStatus.FLAGGED
      : ApplicationStatus.PENDING

    const contentFlags = validationResult.shouldFlag
      ? {
          flaggedAt: new Date(),
          flagType: validationResult.flags,
          flagScore: validationResult.score,
          flagReason: validationResult.reason
        }
      : undefined

    // Create application
    const application = this.applicationRepository.create({
      userId,
      status,
      ipHash,
      isFlagged: validationResult.shouldFlag,
      contentFlags,
      applicationData: {
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
    })

    const saved = await this.applicationRepository.save(application)

    // Create initial status history
    await this.historyRepository.save({
      applicationId: saved.id,
      previousStatus: undefined,
      newStatus: status,
      changedBy: userId,
      reason: validationResult.shouldFlag
        ? `Application flagged: ${validationResult.reason}`
        : 'Application submitted'
    })

    // Log audit
    await this.auditLogService.log({
      actorId: userId,
      action: validationResult.shouldFlag
        ? 'application_flagged'
        : 'application_submitted',
      entityType: 'mentor_application',
      entityId: saved.id,
      changes: {
        status,
        isFlagged: validationResult.shouldFlag,
        contentFlags: contentFlags,
        ipHash
      }
    })

    // Create notification for the applicant
    const notificationMessage = validationResult.shouldFlag
      ? 'Your mentor application has been submitted and is under review due to content verification.'
      : 'Your mentor application has been submitted and is pending review.'

    await this.notificationsService.create({
      userId,
      type: NotificationType.APPLICATION_SUBMITTED,
      title: 'Application Submitted',
      message: notificationMessage,
      payload: { applicationId: saved.id }
    })

    if (validationResult.shouldFlag) {
      this.logger.warn(
        `Mentor application ${saved.id} flagged for user ${userId}: ${validationResult.reason}`
      )
    } else {
      this.logger.log(
        `Mentor application ${saved.id} created by user ${userId}`
      )
    }

    return saved
  }

  async findByUser(userId: string): Promise<MentorApplication[]> {
    return this.applicationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['statusHistory']
    })
  }

  async findOne(id: string): Promise<MentorApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: [
        'user',
        'reviewer',
        'statusHistory',
        'statusHistory.changedByUser'
      ]
    })

    if (!application) {
      throw new NotFoundException('Application not found')
    }

    return application
  }

  async findAll(
    query: ListApplicationsQueryDto
  ): Promise<{ applications: MentorApplication[]; total: number }> {
    const { status, sortBy, sortOrder } = query

    const whereClause: Record<string, any> = {}
    if (status) {
      whereClause.status = status
    }

    const qb = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.user', 'user')
      .where(whereClause)

    // Apply sorting
    if (sortBy) {
      qb.orderBy(`application.${sortBy}`, sortOrder ?? 'DESC')
    } else {
      qb.orderBy('application.createdAt', 'DESC')
    }

    const [applications, total] = await qb
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    return { applications, total }
  }

  async review(
    applicationId: string,
    reviewerId: string,
    dto: ReviewApplicationDto
  ): Promise<MentorApplication> {
    const application = await this.findOne(applicationId)

    if (
      application.status !== ApplicationStatus.PENDING &&
      application.status !== ApplicationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        `Cannot review application with status: ${application.status}`
      )
    }

    if (dto.decision === ReviewDecision.DECLINE && !dto.declineReason) {
      throw new BadRequestException(
        'Decline reason is required when declining an application'
      )
    }

    const previousStatus = application.status
    const newStatus =
      dto.decision === ReviewDecision.APPROVE
        ? ApplicationStatus.APPROVED
        : ApplicationStatus.DECLINED

    // Update application
    application.status = newStatus
    application.reviewedBy = reviewerId
    application.decidedAt = new Date()
    application.adminNotes = dto.adminNotes ?? application.adminNotes

    if (dto.decision === ReviewDecision.DECLINE) {
      application.declineReason = dto.declineReason
    }

    await this.applicationRepository.save(application)

    // Create status history
    await this.historyRepository.save({
      applicationId,
      previousStatus,
      newStatus,
      changedBy: reviewerId,
      reason:
        dto.decision === ReviewDecision.APPROVE
          ? 'Application approved'
          : dto.declineReason
    })

    // If approved, update user role to MENTOR
    if (dto.decision === ReviewDecision.APPROVE) {
      // Double-check user's current role before granting mentor status
      const currentUser = await this.usersService.findOne(application.userId)

      if (!currentUser) {
        throw new NotFoundException('Applicant user not found')
      }

      // Admins should not be converted to mentors
      if (currentUser.role === UserRole.ADMIN) {
        throw new BadRequestException(
          'Cannot grant mentor role to an admin user. Admin privileges supersede mentor roles.'
        )
      }

      // Only update role if user is still a student
      if (currentUser.role === UserRole.STUDENT) {
        await this.usersService.update(application.userId, {
          role: UserRole.MENTOR
        } as any)

        this.logger.log(
          `User ${application.userId} granted MENTOR role via application ${applicationId}`
        )
      } else {
        this.logger.warn(
          `User ${application.userId} already has role ${currentUser.role}, skipping role update`
        )
      }

      // Populate mentor profile with application data
      const existingProfile = await this.mentorProfilesService.findByUserId(
        application.userId
      )

      const profileData = {
        headline: application.applicationData.headline,
        bio: application.applicationData.bio,
        expertise: application.applicationData.expertise || [],
        skills: application.applicationData.skills || [],
        industries: application.applicationData.industries || [],
        languages: application.applicationData.languages || [],
        yearsExperience: application.applicationData.yearsExperience,
        linkedinUrl: application.applicationData.linkedinUrl,
        portfolioUrl: application.applicationData.portfolioUrl
      }

      if (existingProfile) {
        // Update existing profile with application data
        await this.mentorProfilesService.update(application.userId, profileData)
        this.logger.log(
          `Updated mentor profile for user ${application.userId} with application data`
        )
      } else {
        // Create new profile with application data
        await this.mentorProfilesService.createProfile(
          application.userId,
          profileData
        )
        this.logger.log(
          `Created mentor profile for user ${application.userId} with application data`
        )
      }
    }

    // Log audit
    await this.auditLogService.logStateTransition(
      reviewerId,
      'mentor_application',
      applicationId,
      dto.decision === ReviewDecision.APPROVE
        ? 'application_approved'
        : 'application_declined',
      previousStatus,
      newStatus,
      { declineReason: dto.declineReason, adminNotes: dto.adminNotes }
    )

    // Send notification to applicant
    await this.notificationsService.create({
      userId: application.userId,
      type:
        dto.decision === ReviewDecision.APPROVE
          ? NotificationType.APPLICATION_APPROVED
          : NotificationType.APPLICATION_DECLINED,
      title:
        dto.decision === ReviewDecision.APPROVE
          ? 'Application Approved!'
          : 'Application Update',
      message:
        dto.decision === ReviewDecision.APPROVE
          ? 'Congratulations! Your mentor application has been approved. You can now set up your mentor profile.'
          : `Your mentor application has been declined. ${dto.declineReason ?? ''}`,
      payload: { applicationId }
    })

    return this.findOne(applicationId)
  }

  async withdraw(applicationId: string, userId: string): Promise<void> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId, userId }
    })

    if (!application) {
      throw new NotFoundException('Application not found')
    }

    if (
      application.status !== ApplicationStatus.PENDING &&
      application.status !== ApplicationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        'Can only withdraw pending or under-review applications'
      )
    }

    const previousStatus = application.status
    application.status = ApplicationStatus.WITHDRAWN

    await this.applicationRepository.save(application)

    await this.historyRepository.save({
      applicationId,
      previousStatus,
      newStatus: ApplicationStatus.WITHDRAWN,
      changedBy: userId,
      reason: 'Application withdrawn by applicant'
    })

    await this.auditLogService.logStateTransition(
      userId,
      'mentor_application',
      applicationId,
      'application_withdrawn',
      previousStatus,
      ApplicationStatus.WITHDRAWN
    )
  }

  async setUnderReview(
    applicationId: string,
    adminId: string
  ): Promise<MentorApplication> {
    const application = await this.findOne(applicationId)

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(
        'Can only mark pending applications as under review'
      )
    }

    const previousStatus = application.status
    application.status = ApplicationStatus.UNDER_REVIEW

    await this.applicationRepository.save(application)

    await this.historyRepository.save({
      applicationId,
      previousStatus,
      newStatus: ApplicationStatus.UNDER_REVIEW,
      changedBy: adminId,
      reason: 'Application marked as under review'
    })

    await this.auditLogService.logStateTransition(
      adminId,
      'mentor_application',
      applicationId,
      'application_under_review',
      previousStatus,
      ApplicationStatus.UNDER_REVIEW
    )

    return this.findOne(applicationId)
  }

  async findFlaggedApplications(): Promise<MentorApplication[]> {
    return await this.applicationRepository.find({
      where: { isFlagged: true },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    })
  }

  async unflagApplication(
    applicationId: string,
    adminId: string
  ): Promise<MentorApplication> {
    const application = await this.findOne(applicationId)

    if (!application.isFlagged) {
      throw new BadRequestException('Application is not flagged')
    }

    const previousStatus = application.status

    // Update status from FLAGGED to PENDING
    application.status = ApplicationStatus.PENDING
    application.isFlagged = false

    await this.applicationRepository.save(application)

    // Record status change
    await this.historyRepository.save({
      applicationId,
      previousStatus,
      newStatus: ApplicationStatus.PENDING,
      changedBy: adminId,
      reason: 'Manually unflagged by admin'
    })

    // Log audit
    await this.auditLogService.log({
      actorId: adminId,
      action: 'application_unflagged',
      entityType: 'mentor_application',
      entityId: applicationId,
      changes: {
        status: ApplicationStatus.PENDING,
        isFlagged: false
      }
    })

    this.logger.log(
      `Application ${applicationId} unflagged by admin ${adminId}`
    )

    return this.findOne(applicationId)
  }

  async getIpHashStatistics(): Promise<
    Array<{ ipHash: string; count: number }>
  > {
    const results = await this.applicationRepository
      .createQueryBuilder('application')
      .select('application.ipHash', 'ipHash')
      .addSelect('COUNT(*)', 'count')
      .where('application.ipHash IS NOT NULL')
      .groupBy('application.ipHash')
      .having('COUNT(*) > 1')
      .orderBy('count', 'DESC')
      .limit(50)
      .getRawMany()

    return results.map((r) => ({
      ipHash: r.ipHash,
      count: parseInt(r.count, 10)
    }))
  }
}
