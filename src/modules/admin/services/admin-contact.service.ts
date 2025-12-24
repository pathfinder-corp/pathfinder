import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  ContactMessage,
  ContactStatus,
  ContactType
} from '../../contact/entities/contact-message.entity'
import { MailService } from '../../mail/mail.service'
import { AdminContactQueryDto } from '../dto/admin-contact.dto'
import { PaginatedResponseDto } from '../dto/pagination.dto'

@Injectable()
export class AdminContactService {
  private readonly logger = new Logger(AdminContactService.name)

  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactMessageRepository: Repository<ContactMessage>,
    private readonly mailService: MailService
  ) {}

  async findAll(
    query: AdminContactQueryDto
  ): Promise<PaginatedResponseDto<ContactMessage>> {
    const qb = this.contactMessageRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.user', 'user')
      .leftJoinAndSelect('contact.respondedByUser', 'respondedByUser')

    // Filter by status
    if (query.status) {
      qb.andWhere('contact.status = :status', { status: query.status })
    }

    // Filter by type
    if (query.type) {
      qb.andWhere('contact.type = :type', { type: query.type })
    }

    // Search by name, email, or message content
    if (query.search) {
      qb.andWhere(
        '(contact.name ILIKE :search OR contact.email ILIKE :search OR contact.message ILIKE :search)',
        { search: `%${query.search}%` }
      )
    }

    // Sort
    const sortField = query.sortBy || 'createdAt'
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'name',
      'email',
      'status',
      'type'
    ]

    if (allowedSortFields.includes(sortField)) {
      qb.orderBy(
        `contact.${sortField}`,
        (query.sortOrder || 'DESC') as 'ASC' | 'DESC'
      )
    } else {
      qb.orderBy('contact.createdAt', 'DESC')
    }

    const [contacts, total] = await qb
      .skip(query.skip ?? 0)
      .take(query.take ?? 20)
      .getManyAndCount()

    return new PaginatedResponseDto(
      contacts,
      total,
      query.page ?? 1,
      query.limit ?? 20
    )
  }

  async findOne(id: string): Promise<ContactMessage> {
    const contact = await this.contactMessageRepository.findOne({
      where: { id },
      relations: ['user', 'respondedByUser']
    })

    if (!contact) {
      throw new NotFoundException(`Contact message with ID ${id} not found`)
    }

    return contact
  }

  async updateStatus(
    id: string,
    status: ContactStatus,
    adminId: string
  ): Promise<ContactMessage> {
    const contact = await this.findOne(id)

    contact.status = status
    contact.updatedAt = new Date()

    // If marking as resolved/closed and no response yet, set respondedBy
    if (
      (status === ContactStatus.RESOLVED || status === ContactStatus.CLOSED) &&
      !contact.respondedBy
    ) {
      contact.respondedBy = adminId
      contact.respondedAt = new Date()
    }

    return this.contactMessageRepository.save(contact)
  }

  async respond(
    id: string,
    response: string,
    adminId: string
  ): Promise<ContactMessage> {
    const contact = await this.findOne(id)

    if (!response || response.trim().length === 0) {
      throw new BadRequestException('Response message is required')
    }

    if (response.length > 5000) {
      throw new BadRequestException(
        'Response message must be less than 5000 characters'
      )
    }

    contact.adminResponse = response
    contact.respondedBy = adminId
    contact.respondedAt = new Date()

    // Auto-update status to resolved if still pending or in_progress
    if (
      contact.status === ContactStatus.PENDING ||
      contact.status === ContactStatus.IN_PROGRESS
    ) {
      contact.status = ContactStatus.RESOLVED
    }

    const saved = await this.contactMessageRepository.save(contact)

    // Send email notification to user
    try {
      await this.mailService.sendContactResponseEmail(
        contact.email,
        contact.name,
        response,
        contact.message,
        contact.subject
      )

      this.logger.log(
        `Contact response email sent to ${contact.email} for message ${id}`
      )
    } catch (error) {
      // Log error but don't fail the response - email is optional
      this.logger.error(
        `Failed to send contact response email to ${contact.email}:`,
        error
      )
    }

    return saved
  }

  async getStats(): Promise<{
    total: number
    pending: number
    inProgress: number
    resolved: number
    closed: number
    byType: {
      general: number
      suspended: number
      feedback: number
      support: number
    }
  }> {
    const total = await this.contactMessageRepository.count()

    const pending = await this.contactMessageRepository.count({
      where: { status: ContactStatus.PENDING }
    })

    const inProgress = await this.contactMessageRepository.count({
      where: { status: ContactStatus.IN_PROGRESS }
    })

    const resolved = await this.contactMessageRepository.count({
      where: { status: ContactStatus.RESOLVED }
    })

    const closed = await this.contactMessageRepository.count({
      where: { status: ContactStatus.CLOSED }
    })

    const byType = {
      general: await this.contactMessageRepository.count({
        where: { type: ContactType.GENERAL }
      }),
      suspended: await this.contactMessageRepository.count({
        where: { type: ContactType.SUSPENDED }
      }),
      feedback: await this.contactMessageRepository.count({
        where: { type: ContactType.FEEDBACK }
      }),
      support: await this.contactMessageRepository.count({
        where: { type: ContactType.SUPPORT }
      })
    }

    return {
      total,
      pending,
      inProgress,
      resolved,
      closed,
      byType
    }
  }
}
