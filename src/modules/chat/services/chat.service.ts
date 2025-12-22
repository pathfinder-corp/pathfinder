import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { MentorProfilesService } from '../../mentor-profiles/mentor-profiles.service'
import { Mentorship, MentorshipStatus } from '../../mentorships/entities/mentorship.entity'
import { MentorshipsService } from '../../mentorships/mentorships.service'
import {
  EditMessageDto,
  GetMessagesQueryDto,
  SendMessageDto
} from '../dto/message.dto'
import { Conversation } from '../entities/conversation.entity'
import { Message, MessageType } from '../entities/message.entity'

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly mentorshipsService: MentorshipsService,
    private readonly mentorProfilesService: MentorProfilesService
  ) {}

  async getOrCreateConversation(mentorshipId: string): Promise<Conversation> {
    const mentorship = await this.mentorshipsService.findOne(mentorshipId)

    if (mentorship.status !== MentorshipStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot create conversation for inactive mentorship'
      )
    }

    let conversation = await this.conversationRepository.findOne({
      where: { mentorshipId },
      relations: ['mentorship', 'participant1', 'participant2']
    })

    if (!conversation) {
      // Check if there's an existing conversation between same participants
      const existingConversation = await this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.mentorship', 'mentorship')
        .leftJoinAndSelect('conversation.participant1', 'participant1')
        .leftJoinAndSelect('conversation.participant2', 'participant2')
        .where(
          '(conversation.participant1_id = :mentorId AND conversation.participant2_id = :studentId) OR (conversation.participant1_id = :studentId AND conversation.participant2_id = :mentorId)',
          { mentorId: mentorship.mentorId, studentId: mentorship.studentId }
        )
        .orderBy('conversation.last_message_at', 'DESC', 'NULLS LAST')
        .getOne()

      if (existingConversation) {
        // Check if the existing conversation's mentorship is still active
        // Only reuse conversation if the old mentorship is still active
        // If old mentorship ended, create new conversation for new mentorship
        if (existingConversation.mentorshipId === mentorshipId) {
          // Already linked to this mentorship, just reload with relations
          conversation = await this.conversationRepository.findOne({
            where: { id: existingConversation.id },
            relations: ['mentorship', 'participant1', 'participant2']
          })
          
          if (!conversation) {
            throw new NotFoundException(
              `Failed to reload conversation ${existingConversation.id}`
            )
          }
          
          // Ensure mentorship relation is refreshed
          conversation.mentorship = mentorship
        } else if (existingConversation.mentorship?.status === MentorshipStatus.ACTIVE) {
          // Old mentorship is still active, this shouldn't happen normally
          // But if it does, we should not reuse to avoid conflicts
          this.logger.warn(
            `Found active conversation ${existingConversation.id} with different mentorship ${existingConversation.mentorshipId}. Creating new conversation for mentorship ${mentorshipId}`
          )
          
          // Create new conversation instead of reusing
          conversation = this.conversationRepository.create({
            mentorshipId,
            participant1Id: mentorship.mentorId,
            participant2Id: mentorship.studentId
          })

          conversation = await this.conversationRepository.save(conversation)
          
          // Reload with relations
          conversation = await this.conversationRepository.findOne({
            where: { id: conversation.id },
            relations: ['mentorship', 'participant1', 'participant2']
          })
          
          if (!conversation) {
            throw new NotFoundException(
              `Failed to reload newly created conversation`
            )
          }
          
          this.logger.log(
            `Created new conversation ${conversation.id} for mentorship ${mentorshipId} (old conversation ${existingConversation.id} has ended mentorship)`
          )
        } else {
          // Old mentorship has ended, create new conversation for new mentorship
          this.logger.log(
            `Existing conversation ${existingConversation.id} has ended mentorship ${existingConversation.mentorshipId}. Creating new conversation for active mentorship ${mentorshipId}`
          )
          
          conversation = this.conversationRepository.create({
            mentorshipId,
            participant1Id: mentorship.mentorId,
            participant2Id: mentorship.studentId
          })

          conversation = await this.conversationRepository.save(conversation)
          
          // Reload with relations
          conversation = await this.conversationRepository.findOne({
            where: { id: conversation.id },
            relations: ['mentorship', 'participant1', 'participant2']
          })
          
          if (!conversation) {
            throw new NotFoundException(
              `Failed to reload newly created conversation`
            )
          }
          
          this.logger.log(
            `Created new conversation ${conversation.id} for mentorship ${mentorshipId}`
          )
        }
      } else {
        // No existing conversation, create new one
        conversation = this.conversationRepository.create({
          mentorshipId,
          participant1Id: mentorship.mentorId,
          participant2Id: mentorship.studentId
        })

        conversation = await this.conversationRepository.save(conversation)
        
        // Reload with relations
        conversation = await this.conversationRepository.findOne({
          where: { id: conversation.id },
          relations: ['mentorship', 'participant1', 'participant2']
        })
        
        if (!conversation) {
          throw new NotFoundException(
            `Failed to reload newly created conversation`
          )
        }
        
        this.logger.log(
          `Created conversation ${conversation.id} for mentorship ${mentorshipId}`
        )
      }
    }

    // Populate mentorProfileId
    await this.populateMentorProfileId(conversation)

    return conversation
  }

  /**
   * Populates mentorProfileId for a single conversation
   */
  private async populateMentorProfileId(
    conversation: Conversation
  ): Promise<void> {
    if (!conversation.mentorship?.mentorId) {
      return
    }

    try {
      const mentorProfile = await this.mentorProfilesService.findByUserId(
        conversation.mentorship.mentorId
      )
      if (mentorProfile) {
        ;(conversation as any).mentorProfileId = mentorProfile.id
      }
    } catch {
      // Mentor profile may not exist, leave mentorProfileId undefined
    }
  }

  async getConversationById(conversationId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['mentorship', 'participant1', 'participant2']
    })

    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    // Populate mentorProfileId
    await this.populateMentorProfileId(conversation)

    return conversation
  }

  async getConversationByMentorshipId(
    mentorshipId: string
  ): Promise<Conversation | null> {
    return await this.conversationRepository.findOne({
      where: { mentorshipId },
      relations: ['mentorship', 'participant1', 'participant2']
    })
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.mentorship', 'mentorship')
      .leftJoinAndSelect('conversation.participant1', 'participant1')
      .leftJoinAndSelect('conversation.participant2', 'participant2')
      .where(
        '(conversation.participant1_id = :userId OR conversation.participant2_id = :userId)',
        { userId }
      )
      .orderBy('conversation.last_message_at', 'DESC', 'NULLS LAST')
      .getMany()

    // Populate mentorProfileId for each conversation
    await this.populateMentorProfileIds(conversations)

    return conversations
  }

  /**
   * Populates mentorProfileId for multiple conversations efficiently
   */
  private async populateMentorProfileIds(
    conversations: Conversation[]
  ): Promise<void> {
    if (conversations.length === 0) {
      return
    }

    // Get unique mentor IDs
    const mentorIds = new Set<string>()
    conversations.forEach((conv) => {
      if (conv.mentorship?.mentorId) {
        mentorIds.add(conv.mentorship.mentorId)
      }
    })

    // Fetch all mentor profiles in batch
    const mentorProfileMap = new Map<string, string>()
    await Promise.all(
      Array.from(mentorIds).map(async (mentorId) => {
        try {
          const mentorProfile =
            await this.mentorProfilesService.findByUserId(mentorId)
          if (mentorProfile) {
            mentorProfileMap.set(mentorId, mentorProfile.id)
          }
        } catch {
          // Mentor profile may not exist, skip
        }
      })
    )

    // Assign mentorProfileId to each conversation
    conversations.forEach((conv) => {
      if (conv.mentorship?.mentorId) {
        const mentorProfileId = mentorProfileMap.get(conv.mentorship.mentorId)
        if (mentorProfileId) {
          ;(conv as any).mentorProfileId = mentorProfileId
        }
      }
    })
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto
  ): Promise<{ message: Message; mentorship: Mentorship }> {
    const conversation = await this.getConversationById(conversationId)

    // Verify sender is participant
    if (
      conversation.participant1Id !== senderId &&
      conversation.participant2Id !== senderId
    ) {
      throw new ForbiddenException('Not a participant of this conversation')
    }

    const mentorship = await this.mentorshipsService.findOne(conversation.mentorshipId)
    if (!mentorship) {
      throw new NotFoundException(
        `Mentorship ${conversation.mentorshipId} not found for conversation ${conversationId}`
      )
    }

    if (mentorship.status !== MentorshipStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot send message to inactive mentorship'
      )
    }

    // Validate parent message if replying
    if (dto.parentMessageId) {
      const parentMessage = await this.messageRepository.findOne({
        where: { id: dto.parentMessageId, conversationId }
      })

      if (!parentMessage) {
        throw new BadRequestException('Parent message not found')
      }
    }

    const message = this.messageRepository.create({
      conversationId,
      senderId,
      content: dto.content,
      parentMessageId: dto.parentMessageId,
      type: MessageType.TEXT
    })

    await this.messageRepository.save(message)

    // Update conversation last message time
    conversation.lastMessageAt = new Date()
    await this.conversationRepository.save(conversation)

    // Load sender relation
    const savedMessage = await this.messageRepository.findOne({
      where: { id: message.id },
      relations: ['sender', 'parentMessage', 'parentMessage.sender']
    })

    this.logger.log(
      `Message ${message.id} sent in conversation ${conversationId}`
    )

    return {
      message: savedMessage!,
      mentorship
    }
  }

  async getMessages(
    conversationId: string,
    query: GetMessagesQueryDto
  ): Promise<{ messages: Message[]; hasMore: boolean; nextCursor?: string; mentorship: Mentorship }> {
    const { limit = 50, before } = query

    // First get the conversation to access mentorship
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['mentorship']
    })

    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    const mentorship = await this.mentorshipsService.findOne(conversation.mentorshipId)
    if (!mentorship) {
      throw new NotFoundException(
        `Mentorship ${conversation.mentorshipId} not found for conversation ${conversationId}`
      )
    }

    const qb = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.parentMessage', 'parentMessage')
      .leftJoinAndSelect('parentMessage.sender', 'parentSender')
      .where('message.conversation_id = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'DESC')
      .take(limit + 1)

    if (before) {
      const cursorMessage = await this.messageRepository.findOne({
        where: { id: before }
      })

      if (cursorMessage) {
        qb.andWhere('message.createdAt < :cursorDate', {
          cursorDate: cursorMessage.createdAt
        })
      }
    }

    const messages = await qb.getMany()
    const hasMore = messages.length > limit

    if (hasMore) {
      messages.pop()
    }

    const nextCursor = hasMore ? messages[messages.length - 1].id : undefined

    return {
      messages: messages.reverse(),
      hasMore,
      nextCursor,
      mentorship
    }
  }

  async editMessage(
    messageId: string,
    userId: string,
    dto: EditMessageDto
  ): Promise<{ message: Message; mentorship: Mentorship }> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'parentMessage', 'parentMessage.sender', 'conversation', 'conversation.mentorship']
    })

    if (!message) {
      throw new NotFoundException('Message not found')
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException("Cannot edit another user's message")
    }

    if (message.isDeleted) {
      throw new BadRequestException('Cannot edit deleted message')
    }

    message.content = dto.content
    message.isEdited = true
    message.editedAt = new Date()

    await this.messageRepository.save(message)

    this.logger.log(`Message ${messageId} edited by user ${userId}`)

    const mentorship = await this.mentorshipsService.findOne(message.conversation!.mentorshipId)
    if (!mentorship) {
      throw new NotFoundException(
        `Mentorship ${message.conversation!.mentorshipId} not found for conversation ${message.conversationId}`
      )
    }

    return {
      message,
      mentorship
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<{ message: Message; mentorship: Mentorship }> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'parentMessage', 'parentMessage.sender', 'conversation', 'conversation.mentorship']
    })

    if (!message) {
      throw new NotFoundException('Message not found')
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException("Cannot delete another user's message")
    }

    if (message.isDeleted) {
      throw new BadRequestException('Message already deleted')
    }

    message.isDeleted = true
    message.deletedAt = new Date()
    message.content = '[Message deleted]'

    await this.messageRepository.save(message)

    this.logger.log(`Message ${messageId} deleted by user ${userId}`)

    const mentorship = await this.mentorshipsService.findOne(message.conversation!.mentorshipId)
    if (!mentorship) {
      throw new NotFoundException(
        `Mentorship ${message.conversation!.mentorshipId} not found for conversation ${message.conversationId}`
      )
    }

    return {
      message,
      mentorship
    }
  }

  async markAsRead(
    conversationId: string,
    userId: string,
    messageIds: string[]
  ): Promise<void> {
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('id IN (:...messageIds)', { messageIds })
      .andWhere('conversation_id = :conversationId', { conversationId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute()

    this.logger.log(
      `Marked ${messageIds.length} messages as read in conversation ${conversationId}`
    )
  }

  async verifyParticipant(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId }
    })

    if (!conversation) {
      return false
    }

    return (
      conversation.participant1Id === userId ||
      conversation.participant2Id === userId
    )
  }

  async getOtherParticipantId(
    conversationId: string,
    userId: string
  ): Promise<string | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId }
    })

    if (!conversation) {
      return null
    }

    return conversation.participant1Id === userId
      ? conversation.participant2Id
      : conversation.participant1Id
  }
}
