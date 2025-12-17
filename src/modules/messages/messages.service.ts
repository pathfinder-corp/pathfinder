import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLogService } from '../../common/services/audit-log.service'
import { NotificationType } from '../notifications/entities/notification.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { SendMessageDto } from './dto/send-message.dto'
import { Message, ThreadType } from './entities/message.entity'
import { ProfanityFilterService } from './services/profanity-filter.service'

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name)
  private readonly maxMessageLength: number

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
    private readonly profanityFilter: ProfanityFilterService,
    private readonly configService: ConfigService
  ) {
    this.maxMessageLength =
      this.configService.get<number>('mentorship.maxMessageLength') ?? 5000
  }

  async send(
    senderId: string,
    threadType: ThreadType,
    threadId: string,
    dto: SendMessageDto,
    recipientIds: string[]
  ): Promise<Message> {
    // Validate message length
    if (dto.content.length > this.maxMessageLength) {
      throw new BadRequestException(
        `Message exceeds maximum length of ${this.maxMessageLength} characters`
      )
    }

    // Check profanity (stub)
    if (!this.profanityFilter.isClean(dto.content)) {
      throw new BadRequestException('Message contains inappropriate content')
    }

    // Sanitize content
    const sanitizedContent = this.profanityFilter.sanitize(dto.content)

    const message = this.messageRepository.create({
      threadType,
      threadId,
      senderId,
      content: sanitizedContent,
      attachments: dto.attachments,
      isRead: false,
      isSystemMessage: false
    })

    const saved = await this.messageRepository.save(message)

    // Send notifications to recipients (exclude sender)
    const otherRecipients = recipientIds.filter((id) => id !== senderId)

    if (otherRecipients.length > 0) {
      await this.notificationsService.createMany(
        otherRecipients.map((userId) => ({
          userId,
          type: NotificationType.NEW_MESSAGE,
          title: 'New Message',
          message: `You have a new message`,
          payload: {
            messageId: saved.id,
            threadType,
            threadId
          }
        }))
      )
    }

    this.logger.debug(
      `Message ${saved.id} sent in ${threadType}:${threadId} by ${senderId}`
    )

    return this.findOne(saved.id)
  }

  async createSystemMessage(
    threadType: ThreadType,
    threadId: string,
    content: string
  ): Promise<Message> {
    const message = this.messageRepository.create({
      threadType,
      threadId,
      senderId: '00000000-0000-0000-0000-000000000000', // System user ID
      content,
      isRead: false,
      isSystemMessage: true
    })

    return this.messageRepository.save(message)
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['sender']
    })

    if (!message) {
      throw new BadRequestException('Message not found')
    }

    return message
  }

  async findByThread(
    threadType: ThreadType,
    threadId: string,
    options?: {
      limit?: number
      offset?: number
      beforeId?: string
    }
  ): Promise<{
    messages: Message[]
    total: number
    unreadCount: number
  }> {
    const { limit = 50, offset = 0, beforeId } = options ?? {}

    const qb = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.thread_type = :threadType', { threadType })
      .andWhere('message.thread_id = :threadId', { threadId })

    if (beforeId) {
      const beforeMessage = await this.messageRepository.findOne({
        where: { id: beforeId }
      })
      if (beforeMessage) {
        qb.andWhere('message.createdAt < :createdAt', {
          createdAt: beforeMessage.createdAt
        })
      }
    }

    const [messages, total] = await qb
      .orderBy('message.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount()

    const unreadCount = await this.messageRepository.count({
      where: {
        threadType,
        threadId,
        isRead: false
      }
    })

    // Return in chronological order
    return {
      messages: messages.reverse(),
      total,
      unreadCount
    }
  }

  async markAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.findOne(messageId)

    // Only mark as read if user is not the sender
    if (message.senderId !== userId && !message.isRead) {
      message.isRead = true
      message.readAt = new Date()
      await this.messageRepository.save(message)
    }

    return message
  }

  async markThreadAsRead(
    threadType: ThreadType,
    threadId: string,
    userId: string
  ): Promise<number> {
    const result = await this.messageRepository.update(
      {
        threadType,
        threadId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    )

    return result.affected ?? 0
  }

  async getUnreadCountByThread(
    threadType: ThreadType,
    threadId: string
  ): Promise<number> {
    return this.messageRepository.count({
      where: {
        threadType,
        threadId,
        isRead: false
      }
    })
  }
}
