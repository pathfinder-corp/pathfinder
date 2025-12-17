import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLogService } from '../../common/services/audit-log.service'
import { UserRole } from '../users/entities/user.entity'
import { SearchMentorsQueryDto } from './dto/search-mentors.dto'
import { UpdateMentorProfileDto } from './dto/update-profile.dto'
import { MentorProfile } from './entities/mentor-profile.entity'

@Injectable()
export class MentorProfilesService {
  private readonly logger = new Logger(MentorProfilesService.name)

  constructor(
    @InjectRepository(MentorProfile)
    private readonly profileRepository: Repository<MentorProfile>,
    private readonly auditLogService: AuditLogService
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
      limit = 20,
      offset = 0
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

    const [mentors, total] = await qb
      .orderBy('profile.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount()

    return { mentors, total }
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
}
