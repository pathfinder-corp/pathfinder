import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLogService } from '../../common/services/audit-log.service'
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto'
import {
  StudentPreference,
  StudentPreferenceData
} from './entities/student-preference.entity'

@Injectable()
export class StudentPreferencesService {
  private readonly logger = new Logger(StudentPreferencesService.name)

  constructor(
    @InjectRepository(StudentPreference)
    private readonly preferencesRepository: Repository<StudentPreference>,
    private readonly auditLogService: AuditLogService
  ) {}

  async upsert(
    userId: string,
    dto: UpsertPreferencesDto
  ): Promise<StudentPreference> {
    // Get current latest version
    const latest = await this.getLatest(userId)
    const nextVersion = latest ? latest.version + 1 : 1

    // Build preferences data
    const preferencesData: StudentPreferenceData = {
      domains: dto.domains,
      goals: dto.goals,
      skills: dto.skills,
      language: dto.language,
      languages: dto.languages,
      minYearsExperience: dto.minYearsExperience,
      industries: dto.industries,
      additionalNotes: dto.additionalNotes
    }

    // Remove undefined fields
    Object.keys(preferencesData).forEach((key) => {
      if (preferencesData[key as keyof StudentPreferenceData] === undefined) {
        delete preferencesData[key as keyof StudentPreferenceData]
      }
    })

    // Create new version
    const preference = this.preferencesRepository.create({
      userId,
      version: nextVersion,
      preferences: preferencesData
    })

    const saved = await this.preferencesRepository.save(preference)

    await this.auditLogService.log({
      actorId: userId,
      action: 'preferences_updated',
      entityType: 'student_preference',
      entityId: saved.id,
      changes: { version: nextVersion }
    })

    this.logger.log(
      `Student preferences updated for user ${userId} (version ${nextVersion})`
    )

    return saved
  }

  async getLatest(userId: string): Promise<StudentPreference | null> {
    return this.preferencesRepository.findOne({
      where: { userId },
      order: { version: 'DESC' }
    })
  }

  async getVersion(
    userId: string,
    version: number
  ): Promise<StudentPreference | null> {
    return this.preferencesRepository.findOne({
      where: { userId, version }
    })
  }

  async getHistory(
    userId: string,
    limit = 10
  ): Promise<{ versions: StudentPreference[]; total: number }> {
    const [versions, total] = await this.preferencesRepository.findAndCount({
      where: { userId },
      order: { version: 'DESC' },
      take: limit
    })

    return { versions, total }
  }

  async getPreferencesData(
    userId: string
  ): Promise<StudentPreferenceData | null> {
    const latest = await this.getLatest(userId)
    return latest?.preferences ?? null
  }
}
