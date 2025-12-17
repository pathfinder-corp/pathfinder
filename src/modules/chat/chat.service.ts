import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { MentorApplication } from '../mentor-applications/entities/mentor-application.entity'
import { MentorshipRequest } from '../mentorship-requests/entities/mentorship-request.entity'
import {
  Mentorship,
  MentorshipStatus
} from '../mentorships/entities/mentorship.entity'
import { ThreadType } from '../messages/entities/message.entity'
import { MessagesService } from '../messages/messages.service'
import { UserRole } from '../users/entities/user.entity'
import {
  ConversationListResponseDto,
  ConversationResponseDto
} from './dto/conversation.dto'
import { SendMessageDto } from './dto/socket-events.dto'
import { Conversation } from './entities/conversation.entity'
import { PresenceService } from './services/presence.service'

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(
    private readonly messagesService: MessagesService,
    private readonly presenceService: PresenceService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(MentorApplication)
    private readonly applicationRepository: Repository<MentorApplication>,
    @InjectRepository(MentorshipRequest)
    private readonly requestRepository: Repository<MentorshipRequest>,
    @InjectRepository(Mentorship)
    private readonly mentorshipRepository: Repository<Mentorship>
  ) {}

  async sendMessage(
    senderId: string,
    dto: SendMessageDto
  ): Promise<{
    message: Awaited<ReturnType<MessagesService['send']>>
    recipientIds: string[]
  }> {
    const recipientIds = await this.getThreadParticipants(
      dto.threadType,
      dto.threadId
    )

    const message = await this.messagesService.send(
      senderId,
      dto.threadType,
      dto.threadId,
      { content: dto.content },
      recipientIds
    )

    // Update conversation metadata
    await this.updateConversation(dto.threadType, dto.threadId, message)

    return { message, recipientIds }
  }

  async markThreadAsRead(
    threadType: ThreadType,
    threadId: string,
    userId: string
  ): Promise<number> {
    return this.messagesService.markThreadAsRead(threadType, threadId, userId)
  }

  async checkParticipant(
    threadType: ThreadType,
    threadId: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    // Admins can access all threads
    if (userRole === (UserRole.ADMIN as string)) {
      return true
    }

    switch (threadType) {
      case ThreadType.APPLICATION: {
        const application = await this.applicationRepository.findOne({
          where: { id: threadId }
        })
        if (!application) {
          throw new NotFoundException('Application thread not found')
        }
        return application.userId === userId
      }

      case ThreadType.REQUEST: {
        const request = await this.requestRepository.findOne({
          where: { id: threadId }
        })
        if (!request) {
          throw new NotFoundException('Request thread not found')
        }
        return request.studentId === userId || request.mentorId === userId
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

  async validateAndGetThreadRoom(
    threadType: ThreadType,
    threadId: string,
    userId: string,
    userRole: string
  ): Promise<string> {
    const isParticipant = await this.checkParticipant(
      threadType,
      threadId,
      userId,
      userRole
    )

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation'
      )
    }

    return `${threadType}:${threadId}`
  }

  async getThreadParticipants(
    threadType: ThreadType,
    threadId: string
  ): Promise<string[]> {
    switch (threadType) {
      case ThreadType.APPLICATION: {
        const application = await this.applicationRepository.findOne({
          where: { id: threadId }
        })
        return application ? [application.userId] : []
      }

      case ThreadType.REQUEST: {
        const request = await this.requestRepository.findOne({
          where: { id: threadId }
        })
        return request ? [request.studentId, request.mentorId] : []
      }

      case ThreadType.MENTORSHIP: {
        const mentorship = await this.mentorshipRepository.findOne({
          where: { id: threadId }
        })
        return mentorship ? [mentorship.studentId, mentorship.mentorId] : []
      }

      default:
        return []
    }
  }

  async getConversationsForUser(
    userId: string
  ): Promise<ConversationListResponseDto> {
    // Get all active mentorships for this user
    const mentorships = await this.mentorshipRepository.find({
      where: [
        { mentorId: userId, status: MentorshipStatus.ACTIVE },
        { studentId: userId, status: MentorshipStatus.ACTIVE }
      ],
      relations: ['mentor', 'student']
    })

    const conversations: ConversationResponseDto[] = []
    let totalUnread = 0

    for (const mentorship of mentorships) {
      // Get or create conversation record
      let conversation = await this.conversationRepository.findOne({
        where: {
          threadType: ThreadType.MENTORSHIP,
          threadId: mentorship.id
        }
      })

      if (!conversation) {
        conversation = await this.conversationRepository.save({
          threadType: ThreadType.MENTORSHIP,
          threadId: mentorship.id
        })
      }

      // Get unread count for this user
      const { unreadCount } = await this.messagesService.findByThread(
        ThreadType.MENTORSHIP,
        mentorship.id,
        { limit: 1 }
      )

      totalUnread += unreadCount

      // Determine the other participant
      const isCurrentUserMentor = mentorship.mentorId === userId
      const otherUser = isCurrentUserMentor
        ? mentorship.student
        : mentorship.mentor

      if (!otherUser) continue

      conversations.push({
        id: conversation.id,
        threadType: ThreadType.MENTORSHIP,
        threadId: mentorship.id,
        participant: {
          id: otherUser.id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          avatar: otherUser.avatar,
          isOnline: this.presenceService.isOnline(otherUser.id)
        },
        lastMessagePreview: conversation.lastMessagePreview ?? undefined,
        lastMessageAt: conversation.lastMessageAt ?? undefined,
        unreadCount,
        updatedAt: conversation.updatedAt
      })
    }

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0
      if (!a.lastMessageAt) return 1
      if (!b.lastMessageAt) return -1
      return (
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime()
      )
    })

    return {
      conversations,
      total: conversations.length,
      totalUnread
    }
  }

  private async updateConversation(
    threadType: ThreadType,
    threadId: string,
    message: Awaited<ReturnType<MessagesService['send']>>
  ): Promise<void> {
    let conversation = await this.conversationRepository.findOne({
      where: { threadType, threadId }
    })

    const preview =
      message.content.length > 100
        ? message.content.substring(0, 97) + '...'
        : message.content

    if (!conversation) {
      conversation = this.conversationRepository.create({
        threadType,
        threadId,
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
        lastMessagePreview: preview
      })
    } else {
      conversation.lastMessageId = message.id
      conversation.lastMessageAt = message.createdAt
      conversation.lastMessagePreview = preview
    }

    await this.conversationRepository.save(conversation)
  }
}
