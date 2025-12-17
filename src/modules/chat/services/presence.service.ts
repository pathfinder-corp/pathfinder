import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  Mentorship,
  MentorshipStatus
} from '../../mentorships/entities/mentorship.entity'
import { ConnectionManagerService } from './connection-manager.service'

export interface UserPresence {
  userId: string
  isOnline: boolean
  lastSeen?: Date
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name)

  // Track last seen timestamps for offline users
  private readonly lastSeenMap = new Map<string, Date>()

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    @InjectRepository(Mentorship)
    private readonly mentorshipRepository: Repository<Mentorship>
  ) {}

  getUserPresence(userId: string): UserPresence {
    const isOnline = this.connectionManager.isUserOnline(userId)
    return {
      userId,
      isOnline,
      lastSeen: isOnline ? undefined : this.lastSeenMap.get(userId)
    }
  }

  getMultiplePresence(userIds: string[]): UserPresence[] {
    return userIds.map((userId) => this.getUserPresence(userId))
  }

  updateLastSeen(userId: string): void {
    this.lastSeenMap.set(userId, new Date())
    this.logger.debug(`Updated last seen for user ${userId}`)
  }

  /**
   * Get users who should be notified about a user's presence change.
   * This includes mentors/students in active mentorships.
   */
  async getInterestedUsers(userId: string): Promise<string[]> {
    // Find all active mentorships where this user is either mentor or student
    const mentorships = await this.mentorshipRepository.find({
      where: [
        { mentorId: userId, status: MentorshipStatus.ACTIVE },
        { studentId: userId, status: MentorshipStatus.ACTIVE }
      ],
      select: ['mentorId', 'studentId']
    })

    const interestedUsers = new Set<string>()

    for (const mentorship of mentorships) {
      if (mentorship.mentorId !== userId) {
        interestedUsers.add(mentorship.mentorId)
      }
      if (mentorship.studentId !== userId) {
        interestedUsers.add(mentorship.studentId)
      }
    }

    return Array.from(interestedUsers)
  }

  /**
   * Get socket IDs of users who should be notified about a presence change
   */
  async getInterestedSockets(userId: string): Promise<string[]> {
    const interestedUsers = await this.getInterestedUsers(userId)
    const sockets: string[] = []

    for (const interestedUserId of interestedUsers) {
      const userSockets =
        this.connectionManager.getUserSockets(interestedUserId)
      sockets.push(...userSockets)
    }

    return sockets
  }

  isOnline(userId: string): boolean {
    return this.connectionManager.isUserOnline(userId)
  }
}
