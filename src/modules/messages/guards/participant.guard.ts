import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { MentorApplication } from '../../mentor-applications/entities/mentor-application.entity'
import { MentorshipRequest } from '../../mentorship-requests/entities/mentorship-request.entity'
import { Mentorship } from '../../mentorships/entities/mentorship.entity'
import { UserRole } from '../../users/entities/user.entity'
import { ThreadType } from '../entities/message.entity'

@Injectable()
export class ParticipantGuard implements CanActivate {
  constructor(
    @InjectRepository(MentorApplication)
    private readonly applicationRepository: Repository<MentorApplication>,
    @InjectRepository(MentorshipRequest)
    private readonly requestRepository: Repository<MentorshipRequest>,
    @InjectRepository(Mentorship)
    private readonly mentorshipRepository: Repository<Mentorship>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const threadType = request.params.threadType as ThreadType
    const threadId = request.params.threadId

    // Admins can access all threads
    if (user.role === UserRole.ADMIN) {
      return true
    }

    const isParticipant = await this.checkParticipant(
      threadType,
      threadId,
      user.id
    )

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation'
      )
    }

    return true
  }

  private async checkParticipant(
    threadType: ThreadType,
    threadId: string,
    userId: string
  ): Promise<boolean> {
    switch (threadType) {
      case ThreadType.APPLICATION: {
        const application = await this.applicationRepository.findOne({
          where: { id: threadId }
        })
        if (!application) {
          throw new NotFoundException('Application thread not found')
        }
        // For applications, participants are the applicant and any admin
        return application.userId === userId
      }

      case ThreadType.REQUEST: {
        const mentorshipRequest = await this.requestRepository.findOne({
          where: { id: threadId }
        })
        if (!mentorshipRequest) {
          throw new NotFoundException('Request thread not found')
        }
        return (
          mentorshipRequest.studentId === userId ||
          mentorshipRequest.mentorId === userId
        )
      }

      case ThreadType.MENTORSHIP: {
        const mentorship = await this.mentorshipRepository.findOne({
          where: { id: threadId }
        })
        if (!mentorship) {
          throw new NotFoundException('Mentorship thread not found')
        }
        return mentorship.studentId === userId || mentorship.mentorId === userId
      }

      default:
        return false
    }
  }
}
