import {
  BadRequestException,
  Injectable,
  Logger
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { ContactMessage, ContactStatus, ContactType } from './entities/contact-message.entity'
import { CreateContactDto } from './dto/create-contact.dto'

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name)
  private readonly RATE_LIMIT_MESSAGES = 5 // Max messages per hour
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour in milliseconds

  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactMessageRepository: Repository<ContactMessage>
  ) {}

  async create(
    dto: CreateContactDto,
    userId?: string
  ): Promise<ContactMessage> {
    // Rate limiting check
    await this.checkRateLimit(dto.email)

    // Create contact message
    const contactMessage = this.contactMessageRepository.create({
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
      type: dto.type || ContactType.GENERAL,
      userId: userId || undefined,
      status: ContactStatus.PENDING
    })

    const saved = await this.contactMessageRepository.save(contactMessage)

    this.logger.log(
      `Contact message created: ${saved.id} from ${dto.email} (type: ${saved.type}, userId: ${userId || 'guest'})`
    )

    return saved
  }

  /**
   * Check rate limit for email address
   * Throws BadRequestException if rate limit exceeded
   */
  private async checkRateLimit(email: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - this.RATE_LIMIT_WINDOW_MS)

    // Use query builder for date comparison
    const recentCount = await this.contactMessageRepository
      .createQueryBuilder('contact')
      .where('contact.email = :email', { email })
      .andWhere('contact.created_at >= :oneHourAgo', { oneHourAgo })
      .getCount()

    if (recentCount >= this.RATE_LIMIT_MESSAGES) {
      throw new BadRequestException(
        `Rate limit exceeded. Maximum ${this.RATE_LIMIT_MESSAGES} messages per hour allowed. Please try again later.`
      )
    }
  }

  async findById(id: string): Promise<ContactMessage> {
    const message = await this.contactMessageRepository.findOne({
      where: { id },
      relations: ['user', 'respondedByUser']
    })

    if (!message) {
      throw new BadRequestException('Contact message not found')
    }

    return message
  }
}