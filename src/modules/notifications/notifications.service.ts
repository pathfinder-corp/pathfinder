import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import { Notification, NotificationType } from './entities/notification.entity'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message?: string
  payload?: Record<string, any>
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>
  ) {}

  async create(params: CreateNotificationParams): Promise<Notification> {
    const notification = this.notificationRepository.create(params)
    const saved = await this.notificationRepository.save(notification)

    this.logger.log(
      `[NOTIFICATION] Created ${params.type} for user ${params.userId}: ${params.title}`
    )

    return saved
  }

  async createMany(
    notifications: CreateNotificationParams[]
  ): Promise<Notification[]> {
    const entities = notifications.map((n) =>
      this.notificationRepository.create(n)
    )
    return this.notificationRepository.save(entities)
  }

  async findByUser(
    userId: string,
    options?: {
      page?: number
      limit?: number
      unreadOnly?: boolean
    }
  ): Promise<{
    notifications: Notification[]
    total: number
    unreadCount: number
  }> {
    const { page = 1, limit = 50, unreadOnly = false } = options ?? {}

    const whereClause: Record<string, any> = { userId }
    if (unreadOnly) {
      whereClause.isRead = false
    }

    const skip = (page - 1) * limit

    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: whereClause,
        order: { createdAt: 'DESC' },
        take: limit,
        skip: skip
      })

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false }
    })

    return { notifications, total, unreadCount }
  }

  async markAsRead(
    userId: string,
    notificationIds?: string[]
  ): Promise<number> {
    const now = new Date()

    if (notificationIds && notificationIds.length > 0) {
      const result = await this.notificationRepository.update(
        {
          id: In(notificationIds),
          userId,
          isRead: false
        },
        {
          isRead: true,
          readAt: now
        }
      )
      return result.affected ?? 0
    }

    // Mark all unread notifications as read
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: now }
    )
    return result.affected ?? 0
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false }
    })
  }

  async deleteOldNotifications(daysOld: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .andWhere('is_read = true')
      .execute()

    return result.affected ?? 0
  }
}
