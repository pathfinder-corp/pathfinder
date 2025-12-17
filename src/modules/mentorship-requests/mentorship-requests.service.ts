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
import { LessThan, Repository } from 'typeorm'

import { AuditLogService } from '../../common/services/audit-log.service'
import { MentorProfilesService } from '../mentor-profiles/mentor-profiles.service'
import { MentorshipsService } from '../mentorships/mentorships.service'
import { NotificationType } from '../notifications/entities/notification.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { UserRole } from '../users/entities/user.entity'
import { CreateMentorshipRequestDto } from './dto/create-request.dto'
import { ListRequestsQueryDto } from './dto/list-requests.dto'
import { AcceptRequestDto, DeclineRequestDto } from './dto/respond-request.dto'
import {
  MentorshipRequest,
  RequestStatus
} from './entities/mentorship-request.entity'

@Injectable()
export class MentorshipRequestsService {
  private readonly logger = new Logger(MentorshipRequestsService.name)

  constructor(
    @InjectRepository(MentorshipRequest)
    private readonly requestRepository: Repository<MentorshipRequest>,
    private readonly mentorProfilesService: MentorProfilesService,
    private readonly mentorshipsService: MentorshipsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService
  ) {}

  async create(
    studentId: string,
    dto: CreateMentorshipRequestDto
  ): Promise<MentorshipRequest> {
    // Verify mentor exists and is active
    const mentorProfile = await this.mentorProfilesService.findByUserId(
      dto.mentorId
    )

    if (!mentorProfile || !mentorProfile.isActive) {
      throw new NotFoundException('Mentor not found or not accepting mentees')
    }

    if (!mentorProfile.isAcceptingMentees) {
      throw new BadRequestException('Mentor is not currently accepting mentees')
    }

    // Check for existing pending request to same mentor
    const existingPending = await this.requestRepository.findOne({
      where: {
        studentId,
        mentorId: dto.mentorId,
        status: RequestStatus.PENDING
      }
    })

    if (existingPending) {
      throw new ConflictException(
        'You already have a pending request with this mentor'
      )
    }

    // Check if active mentorship already exists
    const activeMentorship = await this.mentorshipsService.findActiveBetween(
      dto.mentorId,
      studentId
    )

    if (activeMentorship) {
      throw new ConflictException(
        'You already have an active mentorship with this mentor'
      )
    }

    // Calculate expiry
    const expiryHours =
      this.configService.get<number>('mentorship.requestExpiryHours') ?? 72
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiryHours)

    // Create request
    const request = this.requestRepository.create({
      studentId,
      mentorId: dto.mentorId,
      message: dto.message,
      status: RequestStatus.PENDING,
      expiresAt
    })

    const saved = await this.requestRepository.save(request)

    // Audit log
    await this.auditLogService.log({
      actorId: studentId,
      action: 'request_created',
      entityType: 'mentorship_request',
      entityId: saved.id,
      changes: { mentorId: dto.mentorId, status: RequestStatus.PENDING }
    })

    // Notify mentor
    await this.notificationsService.create({
      userId: dto.mentorId,
      type: NotificationType.REQUEST_RECEIVED,
      title: 'New Mentorship Request',
      message: `You have received a new mentorship request`,
      payload: { requestId: saved.id, studentId }
    })

    this.logger.log(
      `Request ${saved.id} created by student ${studentId} for mentor ${dto.mentorId}`
    )

    return this.findOne(saved.id)
  }

  async findOne(id: string): Promise<MentorshipRequest> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['student', 'mentor']
    })

    if (!request) {
      throw new NotFoundException('Request not found')
    }

    return request
  }

  async findByUser(
    userId: string,
    userRole: UserRole,
    query: ListRequestsQueryDto
  ): Promise<{ requests: MentorshipRequest[]; total: number }> {
    const { status, role } = query

    const qb = this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.student', 'student')
      .leftJoinAndSelect('request.mentor', 'mentor')

    // Filter by user's role in the request
    if (role === 'as_student' || userRole === UserRole.STUDENT) {
      qb.where('request.student_id = :userId', { userId })
    } else if (role === 'as_mentor' || userRole === UserRole.MENTOR) {
      qb.where('request.mentor_id = :userId', { userId })
    } else {
      // Admin or unspecified - show both
      qb.where(
        '(request.student_id = :userId OR request.mentor_id = :userId)',
        { userId }
      )
    }

    if (status) {
      qb.andWhere('request.status = :status', { status })
    }

    const [requests, total] = await qb
      .orderBy('request.createdAt', 'DESC')
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    return { requests, total }
  }

  async accept(
    requestId: string,
    mentorId: string,
    dto: AcceptRequestDto
  ): Promise<MentorshipRequest> {
    const request = await this.findOne(requestId)

    if (request.mentorId !== mentorId) {
      throw new ForbiddenException('You are not the mentor for this request')
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot accept request with status: ${request.status}`
      )
    }

    // Update request
    request.status = RequestStatus.ACCEPTED
    request.respondedAt = new Date()

    await this.requestRepository.save(request)

    // Audit log
    await this.auditLogService.logStateTransition(
      mentorId,
      'mentorship_request',
      requestId,
      'request_accepted',
      RequestStatus.PENDING,
      RequestStatus.ACCEPTED
    )

    // Create mentorship relationship
    const mentorship =
      await this.mentorshipsService.findOrCreateFromRequest(request)

    // Notify student
    await this.notificationsService.create({
      userId: request.studentId,
      type: NotificationType.REQUEST_ACCEPTED,
      title: 'Request Accepted!',
      message:
        'Your mentorship request has been accepted. You can now message your mentor!',
      payload: { requestId, mentorshipId: mentorship.id }
    })

    this.logger.log(`Request ${requestId} accepted by mentor ${mentorId}`)

    return this.findOne(requestId)
  }

  async decline(
    requestId: string,
    mentorId: string,
    dto: DeclineRequestDto
  ): Promise<MentorshipRequest> {
    const request = await this.findOne(requestId)

    if (request.mentorId !== mentorId) {
      throw new ForbiddenException('You are not the mentor for this request')
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot decline request with status: ${request.status}`
      )
    }

    request.status = RequestStatus.DECLINED
    request.declineReason = dto.reason
    request.respondedAt = new Date()

    await this.requestRepository.save(request)

    await this.auditLogService.logStateTransition(
      mentorId,
      'mentorship_request',
      requestId,
      'request_declined',
      RequestStatus.PENDING,
      RequestStatus.DECLINED,
      { reason: dto.reason }
    )

    await this.notificationsService.create({
      userId: request.studentId,
      type: NotificationType.REQUEST_DECLINED,
      title: 'Request Declined',
      message: `Your mentorship request was declined: ${dto.reason}`,
      payload: { requestId, reason: dto.reason }
    })

    this.logger.log(`Request ${requestId} declined by mentor ${mentorId}`)

    return this.findOne(requestId)
  }

  async cancel(requestId: string, studentId: string): Promise<void> {
    const request = await this.findOne(requestId)

    if (request.studentId !== studentId) {
      throw new ForbiddenException('You are not the student for this request')
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending requests')
    }

    request.status = RequestStatus.CANCELLED
    request.respondedAt = new Date()

    await this.requestRepository.save(request)

    await this.auditLogService.logStateTransition(
      studentId,
      'mentorship_request',
      requestId,
      'request_cancelled',
      RequestStatus.PENDING,
      RequestStatus.CANCELLED
    )

    await this.notificationsService.create({
      userId: request.mentorId,
      type: NotificationType.REQUEST_CANCELLED,
      title: 'Request Cancelled',
      message: 'A mentorship request has been cancelled by the student',
      payload: { requestId }
    })

    this.logger.log(`Request ${requestId} cancelled by student ${studentId}`)
  }

  async expireStaleRequests(): Promise<number> {
    const now = new Date()

    const expiredRequests = await this.requestRepository.find({
      where: {
        status: RequestStatus.PENDING,
        expiresAt: LessThan(now)
      }
    })

    if (expiredRequests.length === 0) {
      return 0
    }

    // Update status
    await this.requestRepository.update(
      { id: expiredRequests.map((r) => r.id) as any },
      { status: RequestStatus.EXPIRED }
    )

    // Send notifications
    for (const request of expiredRequests) {
      await this.notificationsService.create({
        userId: request.studentId,
        type: NotificationType.REQUEST_EXPIRED,
        title: 'Request Expired',
        message: 'Your mentorship request has expired without a response',
        payload: { requestId: request.id }
      })

      await this.auditLogService.logStateTransition(
        null,
        'mentorship_request',
        request.id,
        'request_expired',
        RequestStatus.PENDING,
        RequestStatus.EXPIRED
      )
    }

    this.logger.log(`Expired ${expiredRequests.length} stale requests`)

    return expiredRequests.length
  }

  async getAcceptedRequest(requestId: string): Promise<MentorshipRequest> {
    const request = await this.findOne(requestId)

    if (request.status !== RequestStatus.ACCEPTED) {
      throw new BadRequestException('Request is not accepted')
    }

    return request
  }
}
