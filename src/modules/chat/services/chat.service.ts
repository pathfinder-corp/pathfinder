import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { MentorshipStatus } from '../../mentorships/entities/mentorship.entity'
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
    private readonly mentorshipsService: MentorshipsService
  ) {}

  async getOrCreateConversation(mentorshipId: string): Promise<Conversation> {
    let conversation = await this.conversationRepository.findOne({
      where: { mentorshipId },
      relations: ['mentorship', 'participant1', 'participant2']
    })

    if (!conversation) {
      const mentorship = await this.mentorshipsService.findOne(mentorshipId)

      if (mentorship.status !== MentorshipStatus.ACTIVE) {
        throw new BadRequestException(
          'Cannot create conversation for inactive mentorship'
        )
      }

      conversation = this.conversationRepository.create({
        mentorshipId,
        participant1Id: mentorship.mentorId,
        participant2Id: mentorship.studentId
      })

      await this.conversationRepository.save(conversation)
      this.logger.log(
        `Created conversation ${conversation.id} for mentorship ${mentorshipId}`
      )
    }

    return conversation
  }

  async getConversationById(conversationId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['mentorship', 'participant1', 'participant2']
    })

    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    return conversation
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.mentorship', 'mentorship')
      .leftJoinAndSelect('conversation.participant1', 'participant1')
      .leftJoinAndSelect('conversation.participant2', 'participant2')
      .where(
        '(conversation.participant1_id = :userId OR conversation.participant2_id = :userId)',
        { userId }
      )
      .andWhere('mentorship.status = :status', {
        status: MentorshipStatus.ACTIVE
      })
      .orderBy('conversation.last_message_at', 'DESC', 'NULLS LAST')
      .getMany()
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto
  ): Promise<Message> {
    const conversation = await this.getConversationById(conversationId)

    // Verify sender is participant
    if (
      conversation.participant1Id !== senderId &&
      conversation.participant2Id !== senderId
    ) {
      throw new ForbiddenException('Not a participant of this conversation')
    }

    // Verify mentorship is active
    if (conversation.mentorship?.status !== MentorshipStatus.ACTIVE) {
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

    return savedMessage!
  }

  async getMessages(
    conversationId: string,
    query: GetMessagesQueryDto
  ): Promise<{ messages: Message[]; hasMore: boolean; nextCursor?: string }> {
    const { limit = 50, before } = query

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
      nextCursor
    }
  }

  async editMessage(
    messageId: string,
    userId: string,
    dto: EditMessageDto
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'parentMessage', 'parentMessage.sender']
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

    return message
  }

  async deleteMessage(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'parentMessage', 'parentMessage.sender']
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

    return message
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
