import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLogService } from '../../common/services/audit-log.service'
import { MentorshipRequest } from '../mentorship-requests/entities/mentorship-request.entity'
import { NotificationType } from '../notifications/entities/notification.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { UserRole } from '../users/entities/user.entity'
import { EndMentorshipDto } from './dto/end-mentorship.dto'
import { ListMentorshipsQueryDto } from './dto/list-mentorships.dto'
import { Mentorship, MentorshipStatus } from './entities/mentorship.entity'

@Injectable()
export class MentorshipsService {
  private readonly logger = new Logger(MentorshipsService.name)

  constructor(
    @InjectRepository(Mentorship)
    private readonly mentorshipRepository: Repository<Mentorship>,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService
  ) {}

  async findOrCreateFromRequest(
    request: MentorshipRequest
  ): Promise<Mentorship> {
    // Check if active mentorship already exists
    const existing = await this.mentorshipRepository.findOne({
      where: {
        mentorId: request.mentorId,
        studentId: request.studentId,
        status: MentorshipStatus.ACTIVE
      }
    })

    if (existing) {
      return existing
    }

    // Create new mentorship
    const mentorship = this.mentorshipRepository.create({
      mentorId: request.mentorId,
      studentId: request.studentId,
      status: MentorshipStatus.ACTIVE
    })

    const saved = await this.mentorshipRepository.save(mentorship)

    await this.auditLogService.log({
      actorId: request.mentorId,
      action: 'mentorship_started',
      entityType: 'mentorship',
      entityId: saved.id,
      changes: { mentorId: request.mentorId, studentId: request.studentId }
    })

    // Notify both parties
    await this.notificationsService.create({
      userId: request.studentId,
      type: NotificationType.MENTORSHIP_STARTED,
      title: 'Mentorship Started',
      message: 'Your mentorship relationship has officially started!',
      payload: { mentorshipId: saved.id }
    })

    await this.notificationsService.create({
      userId: request.mentorId,
      type: NotificationType.MENTORSHIP_STARTED,
      title: 'Mentorship Started',
      message: 'A new mentorship relationship has started!',
      payload: { mentorshipId: saved.id }
    })

    this.logger.log(
      `Mentorship ${saved.id} started between mentor ${request.mentorId} and student ${request.studentId}`
    )

    return saved
  }

  async findOne(id: string): Promise<Mentorship> {
    const mentorship = await this.mentorshipRepository.findOne({
      where: { id },
      relations: ['mentor', 'student', 'endedByUser']
    })

    if (!mentorship) {
      throw new NotFoundException('Mentorship not found')
    }

    return mentorship
  }

  async findByUser(
    userId: string,
    userRole: UserRole,
    query: ListMentorshipsQueryDto
  ): Promise<{ mentorships: Mentorship[]; total: number }> {
    const { status, role } = query

    const qb = this.mentorshipRepository
      .createQueryBuilder('mentorship')
      .leftJoinAndSelect('mentorship.mentor', 'mentor')
      .leftJoinAndSelect('mentorship.student', 'student')

    if (role === 'as_mentor' || userRole === UserRole.MENTOR) {
      qb.where('mentorship.mentor_id = :userId', { userId })
    } else if (role === 'as_student' || userRole === UserRole.STUDENT) {
      qb.where('mentorship.student_id = :userId', { userId })
    } else {
      qb.where(
        '(mentorship.mentor_id = :userId OR mentorship.student_id = :userId)',
        { userId }
      )
    }

    if (status) {
      qb.andWhere('mentorship.status = :status', { status })
    }

    const [mentorships, total] = await qb
      .orderBy('mentorship.startedAt', 'DESC')
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    return { mentorships, total }
  }

  async findActiveBetween(
    mentorId: string,
    studentId: string
  ): Promise<Mentorship | null> {
    return this.mentorshipRepository.findOne({
      where: {
        mentorId,
        studentId,
        status: MentorshipStatus.ACTIVE
      }
    })
  }

  async end(
    mentorshipId: string,
    userId: string,
    dto: EndMentorshipDto
  ): Promise<Mentorship> {
    const mentorship = await this.findOne(mentorshipId)

    // Verify user is participant
    if (mentorship.mentorId !== userId && mentorship.studentId !== userId) {
      throw new ForbiddenException(
        'You are not a participant of this mentorship'
      )
    }

    if (mentorship.status !== MentorshipStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot end mentorship with status: ${mentorship.status}`
      )
    }

    mentorship.status = MentorshipStatus.ENDED
    mentorship.endReason = dto.reason
    mentorship.endedBy = userId
    mentorship.endedAt = new Date()

    await this.mentorshipRepository.save(mentorship)

    await this.auditLogService.logStateTransition(
      userId,
      'mentorship',
      mentorshipId,
      'mentorship_ended',
      MentorshipStatus.ACTIVE,
      MentorshipStatus.ENDED,
      { reason: dto.reason }
    )

    // Notify the other party
    const otherUserId =
      mentorship.mentorId === userId
        ? mentorship.studentId
        : mentorship.mentorId

    await this.notificationsService.create({
      userId: otherUserId,
      type: NotificationType.MENTORSHIP_ENDED,
      title: 'Mentorship Ended',
      message: `The mentorship has been ended: ${dto.reason}`,
      payload: { mentorshipId, reason: dto.reason }
    })

    this.logger.log(`Mentorship ${mentorshipId} ended by user ${userId}`)

    return this.findOne(mentorshipId)
  }

  async forceEnd(
    mentorshipId: string,
    adminId: string,
    reason: string
  ): Promise<Mentorship> {
    const mentorship = await this.findOne(mentorshipId)

    if (mentorship.status !== MentorshipStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot end mentorship with status: ${mentorship.status}`
      )
    }

    mentorship.status = MentorshipStatus.ENDED
    mentorship.endReason = `[Admin] ${reason}`
    mentorship.endedBy = adminId
    mentorship.endedAt = new Date()

    await this.mentorshipRepository.save(mentorship)

    await this.auditLogService.logStateTransition(
      adminId,
      'mentorship',
      mentorshipId,
      'mentorship_force_ended',
      MentorshipStatus.ACTIVE,
      MentorshipStatus.ENDED,
      { reason, adminAction: true }
    )

    // Notify both parties
    await this.notificationsService.createMany([
      {
        userId: mentorship.mentorId,
        type: NotificationType.MENTORSHIP_ENDED,
        title: 'Mentorship Ended by Admin',
        message: `The mentorship has been ended by an administrator: ${reason}`,
        payload: { mentorshipId, reason, adminAction: true }
      },
      {
        userId: mentorship.studentId,
        type: NotificationType.MENTORSHIP_ENDED,
        title: 'Mentorship Ended by Admin',
        message: `The mentorship has been ended by an administrator: ${reason}`,
        payload: { mentorshipId, reason, adminAction: true }
      }
    ])

    this.logger.log(
      `Mentorship ${mentorshipId} force ended by admin ${adminId}`
    )

    return this.findOne(mentorshipId)
  }
}
