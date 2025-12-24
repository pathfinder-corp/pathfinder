import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLogService } from '../../common/services/audit-log.service'
import {
  UpdateDocumentDto,
  UploadDocumentDto
} from '../mentor-applications/dto/upload-document.dto'
import {
  ApplicationDocument,
  DocumentType,
  DocumentVerificationStatus
} from '../mentor-applications/entities/application-document.entity'
import { ApplicationStatus } from '../mentor-applications/entities/application-status.enum'
import { MentorApplication } from '../mentor-applications/entities/mentor-application.entity'
import { DocumentUploadService } from '../mentor-applications/services/document-upload.service'
import {
  Mentorship,
  MentorshipStatus
} from '../mentorships/entities/mentorship.entity'
import { UserRole } from '../users/entities/user.entity'
import { UsersService } from '../users/users.service'
import { SearchMentorsQueryDto } from './dto/search-mentors.dto'
import { UpdateMentorProfileDto } from './dto/update-profile.dto'
import { MentorProfile } from './entities/mentor-profile.entity'

@Injectable()
export class MentorProfilesService {
  private readonly logger = new Logger(MentorProfilesService.name)

  constructor(
    @InjectRepository(MentorProfile)
    private readonly profileRepository: Repository<MentorProfile>,
    @InjectRepository(MentorApplication)
    private readonly applicationRepository: Repository<MentorApplication>,
    @InjectRepository(ApplicationDocument)
    private readonly documentRepository: Repository<ApplicationDocument>,
    @InjectRepository(Mentorship)
    private readonly mentorshipRepository: Repository<Mentorship>,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
    private readonly documentUploadService: DocumentUploadService,
    private readonly usersService: UsersService
  ) {}

  async createProfile(
    userId: string,
    initialData?: Partial<MentorProfile>
  ): Promise<MentorProfile> {
    const existing = await this.profileRepository.findOne({
      where: { userId }
    })

    if (existing) {
      return existing
    }

    const profile = this.profileRepository.create({
      userId,
      expertise: [],
      skills: [],
      industries: [],
      languages: [],
      isActive: true,
      isAcceptingMentees: true,
      ...initialData
    })

    const saved = await this.profileRepository.save(profile)

    await this.auditLogService.log({
      actorId: userId,
      action: 'profile_created',
      entityType: 'mentor_profile',
      entityId: saved.id,
      changes: initialData
    })

    this.logger.log(`Created mentor profile for user ${userId}`)

    return saved
  }

  async findByUserId(userId: string): Promise<MentorProfile | null> {
    return this.profileRepository.findOne({
      where: { userId },
      relations: ['user']
    })
  }

  async findById(id: string): Promise<MentorProfile> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user']
    })

    if (!profile) {
      throw new NotFoundException('Mentor profile not found')
    }

    return profile
  }

  async getMyProfile(userId: string): Promise<MentorProfile> {
    let profile = await this.findByUserId(userId)

    if (!profile) {
      // Auto-create profile for mentors
      profile = await this.createProfile(userId)
      profile = await this.findByUserId(userId)
    }

    return profile!
  }

  async update(
    userId: string,
    dto: UpdateMentorProfileDto
  ): Promise<MentorProfile> {
    const profile = await this.findByUserId(userId)

    if (!profile) {
      throw new NotFoundException('Mentor profile not found')
    }

    const updateData: Partial<MentorProfile> = {}

    if (dto.headline !== undefined) updateData.headline = dto.headline
    if (dto.bio !== undefined) updateData.bio = dto.bio
    if (dto.expertise !== undefined) updateData.expertise = dto.expertise
    if (dto.skills !== undefined) updateData.skills = dto.skills
    if (dto.industries !== undefined) updateData.industries = dto.industries
    if (dto.languages !== undefined) updateData.languages = dto.languages
    if (dto.yearsExperience !== undefined)
      updateData.yearsExperience = dto.yearsExperience
    if (dto.linkedinUrl !== undefined) updateData.linkedinUrl = dto.linkedinUrl
    if (dto.portfolioUrl !== undefined)
      updateData.portfolioUrl = dto.portfolioUrl
    if (dto.isAcceptingMentees !== undefined)
      updateData.isAcceptingMentees = dto.isAcceptingMentees
    if (dto.maxMentees !== undefined) updateData.maxMentees = dto.maxMentees

    await this.profileRepository.update({ id: profile.id }, updateData)

    await this.auditLogService.log({
      actorId: userId,
      action: 'profile_updated',
      entityType: 'mentor_profile',
      entityId: profile.id,
      changes: updateData
    })

    return this.findById(profile.id)
  }

  async search(
    query: SearchMentorsQueryDto
  ): Promise<{ mentors: MentorProfile[]; total: number }> {
    const {
      search,
      expertise,
      skills,
      industries,
      languages,
      minYearsExperience,
      sortBy,
      sortOrder
    } = query

    const qb = this.profileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .where('profile.is_active = true')
      .andWhere('profile.is_accepting_mentees = true')
      .andWhere('user.role = :role', { role: UserRole.MENTOR })
      .andWhere('user.status = :status', { status: 'active' })

    if (search) {
      qb.andWhere(
        `(
          user.firstName ILIKE :search OR 
          user.lastName ILIKE :search OR 
          profile.headline ILIKE :search OR 
          profile.bio ILIKE :search
        )`,
        { search: `%${search}%` }
      )
    }

    if (expertise && expertise.length > 0) {
      qb.andWhere('profile.expertise && :expertise', {
        expertise: JSON.stringify(expertise)
      })
    }

    if (skills && skills.length > 0) {
      qb.andWhere('profile.skills && :skills', {
        skills: JSON.stringify(skills)
      })
    }

    if (industries && industries.length > 0) {
      qb.andWhere('profile.industries && :industries', {
        industries: JSON.stringify(industries)
      })
    }

    if (languages && languages.length > 0) {
      qb.andWhere('profile.languages && :languages', {
        languages: JSON.stringify(languages)
      })
    }

    if (minYearsExperience !== undefined) {
      qb.andWhere('profile.years_experience >= :minYears', {
        minYears: minYearsExperience
      })
    }

    // Apply sorting
    if (sortBy) {
      qb.orderBy(`profile.${sortBy}`, sortOrder ?? 'DESC')
    } else {
      qb.orderBy('profile.createdAt', 'DESC')
    }

    const [mentors, total] = await qb
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    return { mentors, total }
  }

  /**
   * Find all mentor profiles for admin (includes inactive)
   */
  async findAllForAdmin(query: {
    isActive?: boolean
    isAcceptingMentees?: boolean
    search?: string
    skip: number
    take: number
  }): Promise<{ mentors: MentorProfile[]; total: number }> {
    const qb = this.profileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .andWhere('user.role = :role', { role: UserRole.MENTOR })

    if (query.isActive !== undefined) {
      qb.andWhere('profile.is_active = :isActive', { isActive: query.isActive })
    }

    if (query.isAcceptingMentees !== undefined) {
      qb.andWhere('profile.is_accepting_mentees = :isAccepting', {
        isAccepting: query.isAcceptingMentees
      })
    }

    if (query.search) {
      qb.andWhere(
        `(
          user.firstName ILIKE :search OR 
          user.lastName ILIKE :search OR 
          user.email ILIKE :search OR
          profile.headline ILIKE :search OR 
          profile.bio ILIKE :search
        )`,
        { search: `%${query.search}%` }
      )
    }

    qb.orderBy('profile.createdAt', 'DESC')

    const [mentors, total] = await qb
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    return { mentors, total }
  }

  /**
   * Get mentor statistics for admin dashboard
   */
  async getMentorStats(): Promise<{
    total: number
    active: number
    inactive: number
    acceptingMentees: number
  }> {
    const total = await this.profileRepository.count()

    const active = await this.profileRepository.count({
      where: { isActive: true }
    })

    const acceptingMentees = await this.profileRepository.count({
      where: { isActive: true, isAcceptingMentees: true }
    })

    return {
      total,
      active,
      inactive: total - active,
      acceptingMentees
    }
  }

  async findPublicProfile(profileId: string): Promise<MentorProfile> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId, isActive: true },
      relations: ['user']
    })

    if (!profile) {
      throw new NotFoundException('Mentor profile not found')
    }

    // Ensure user is still a mentor
    if (profile.user?.role !== UserRole.MENTOR) {
      throw new NotFoundException('Mentor profile not found')
    }

    return profile
  }

  async deactivateProfile(userId: string, adminId?: string): Promise<void> {
    const profile = await this.findByUserId(userId)

    if (!profile) {
      throw new NotFoundException('Mentor profile not found')
    }

    await this.profileRepository.update({ id: profile.id }, { isActive: false })

    await this.auditLogService.log({
      actorId: adminId ?? userId,
      action: 'profile_deactivated',
      entityType: 'mentor_profile',
      entityId: profile.id
    })
  }

  async reactivateProfile(userId: string): Promise<MentorProfile> {
    const profile = await this.findByUserId(userId)

    if (!profile) {
      throw new NotFoundException('Mentor profile not found')
    }

    await this.profileRepository.update({ id: profile.id }, { isActive: true })

    await this.auditLogService.log({
      actorId: userId,
      action: 'profile_reactivated',
      entityType: 'mentor_profile',
      entityId: profile.id
    })

    return this.findById(profile.id)
  }

  /**
   * Delete mentor profile completely (used when admin removes mentor role)
   */
  async deleteProfile(userId: string, adminId?: string): Promise<void> {
    const profile = await this.findByUserId(userId)

    if (!profile) {
      // Profile doesn't exist, nothing to delete
      return
    }

    const profileId = profile.id

    await this.profileRepository.remove(profile)

    await this.auditLogService.log({
      actorId: adminId ?? userId,
      action: 'profile_deleted',
      entityType: 'mentor_profile',
      entityId: profileId,
      changes: { deletedBy: adminId, deletedAt: new Date().toISOString() }
    })

    this.logger.log(`Deleted mentor profile for user ${userId}`)
  }

  /**
   * Mentor voluntarily withdraws from being a mentor.
   * - Requires no active mentorships as mentor.
   * - Demotes user role to STUDENT.
   * - Deactivates mentor profile (treated as deleted in app logic).
   */
  async withdrawAsMentor(userId: string): Promise<void> {
    const profile = await this.findByUserId(userId)

    if (!profile) {
      throw new NotFoundException('Mentor profile not found')
    }

    // Ensure there are no active mentorships where this user is the mentor
    const activeMentorships = await this.mentorshipRepository.count({
      where: {
        mentorId: userId,
        status: MentorshipStatus.ACTIVE
      }
    })

    if (activeMentorships > 0) {
      throw new BadRequestException(
        'You still have active mentorships. Please end all active mentorships before withdrawing as a mentor.'
      )
    }

    const user = await this.usersService.findOne(userId)

    // Only demote if currently mentor (defensive check)
    if (user.role === UserRole.MENTOR) {
      await this.usersService.update(userId, {
        role: UserRole.STUDENT
      } as any)
    }

    // Deactivate mentor profile and stop accepting mentees
    await this.profileRepository.update(
      { id: profile.id },
      { isActive: false, isAcceptingMentees: false }
    )

    await this.auditLogService.log({
      actorId: userId,
      action: 'mentor_withdrawn',
      entityType: 'mentor_profile',
      entityId: profile.id,
      changes: {
        isActive: false,
        isAcceptingMentees: false
      }
    })

    this.logger.log(`User ${userId} withdrew from mentor role`)
  }

  /**
   * Get verified documents for a mentor
   * Documents are from the approved application that made them a mentor
   */
  async getMentorDocuments(userId: string): Promise<ApplicationDocument[]> {
    // Find the approved application for this user
    const application = await this.applicationRepository.findOne({
      where: {
        userId,
        status: ApplicationStatus.APPROVED
      },
      order: { createdAt: 'DESC' }
    })

    if (!application) {
      return []
    }

    // Get verified documents from this application
    const documents = await this.documentRepository.find({
      where: {
        applicationId: application.id,
        verificationStatus: DocumentVerificationStatus.VERIFIED
      },
      order: { displayOrder: 'ASC', createdAt: 'ASC' }
    })

    return documents
  }

  /**
   * Get all documents (including pending) for mentor's own view
   */
  async getMyDocuments(userId: string): Promise<ApplicationDocument[]> {
    // Find any application for this user (approved or pending)
    const application = await this.applicationRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' }
    })

    if (!application) {
      return []
    }

    // Get all documents from this application
    const documents = await this.documentRepository.find({
      where: { applicationId: application.id },
      order: { displayOrder: 'ASC', createdAt: 'ASC' }
    })

    return documents
  }

  /**
   * Get mentor profile with verified documents
   */
  async findPublicProfileWithDocuments(
    profileId: string
  ): Promise<{ profile: MentorProfile; documents: ApplicationDocument[] }> {
    const profile = await this.findPublicProfile(profileId)
    const documents = await this.getMentorDocuments(profile.userId)

    return { profile, documents }
  }

  /**
   * Get approved application for mentor to add documents
   */
  private async getApprovedApplication(
    userId: string
  ): Promise<MentorApplication> {
    const application = await this.applicationRepository.findOne({
      where: {
        userId,
        status: ApplicationStatus.APPROVED
      },
      relations: ['documents'],
      order: { createdAt: 'DESC' }
    })

    if (!application) {
      throw new NotFoundException(
        'No approved application found. Please contact support.'
      )
    }

    return application
  }

  /**
   * Upload a new document for mentor (uses ImageKit via DocumentUploadService)
   */
  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto
  ): Promise<ApplicationDocument> {
    // Get the approved application
    const application = await this.getApprovedApplication(userId)

    // Delegate to DocumentUploadService (which handles ImageKit upload)
    return this.documentUploadService.uploadDocument(
      application.id,
      userId,
      {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size
      },
      dto
    )
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    userId: string,
    documentId: string,
    dto: UpdateDocumentDto
  ): Promise<ApplicationDocument> {
    // Find document and verify ownership
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['application']
    })

    if (!document) {
      throw new NotFoundException('Document not found')
    }

    if (document.application?.userId !== userId) {
      throw new NotFoundException('Document not found')
    }

    // Update allowed fields
    const updateData: Partial<ApplicationDocument> = {}

    if (dto.type !== undefined) updateData.type = dto.type as DocumentType
    if (dto.title !== undefined) updateData.title = dto.title
    if (dto.description !== undefined) updateData.description = dto.description
    if (dto.issuedYear !== undefined) updateData.issuedYear = dto.issuedYear
    if (dto.issuingOrganization !== undefined)
      updateData.issuingOrganization = dto.issuingOrganization
    if (dto.displayOrder !== undefined)
      updateData.displayOrder = dto.displayOrder

    await this.documentRepository.update({ id: documentId }, updateData)

    await this.auditLogService.log({
      actorId: userId,
      action: 'document_updated',
      entityType: 'application_document',
      entityId: documentId,
      changes: updateData
    })

    return this.documentRepository.findOneOrFail({ where: { id: documentId } })
  }

  /**
   * Delete a document (uses DocumentUploadService for ImageKit cleanup)
   */
  async deleteDocument(userId: string, documentId: string): Promise<void> {
    // Find document and verify ownership
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['application']
    })

    if (!document) {
      throw new NotFoundException('Document not found')
    }

    if (document.application?.userId !== userId) {
      throw new NotFoundException('Document not found')
    }

    // Delegate to DocumentUploadService (which handles ImageKit deletion)
    await this.documentUploadService.deleteDocument(documentId, userId)
  }
}
