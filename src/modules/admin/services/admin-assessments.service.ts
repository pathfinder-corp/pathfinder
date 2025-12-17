import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { AssessmentResponse } from '../../assessments/entities/assessment-response.entity'
import { AssessmentResult } from '../../assessments/entities/assessment-result.entity'
import { AssessmentShare } from '../../assessments/entities/assessment-share.entity'
import { Assessment } from '../../assessments/entities/assessment.entity'
import {
  AdminAssessmentDetailResponseDto,
  AdminAssessmentQueryDto,
  AdminAssessmentResponseDto,
  AssessmentOwnerDto
} from '../dto/admin-assessment.dto'
import { PaginatedResponseDto } from '../dto/pagination.dto'

@Injectable()
export class AdminAssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentsRepository: Repository<Assessment>,
    @InjectRepository(AssessmentShare)
    private readonly assessmentSharesRepository: Repository<AssessmentShare>,
    @InjectRepository(AssessmentResponse)
    private readonly assessmentResponsesRepository: Repository<AssessmentResponse>,
    @InjectRepository(AssessmentResult)
    private readonly assessmentResultsRepository: Repository<AssessmentResult>
  ) {}

  async findAll(
    query: AdminAssessmentQueryDto
  ): Promise<PaginatedResponseDto<AdminAssessmentResponseDto>> {
    const qb = this.assessmentsRepository
      .createQueryBuilder('assessment')
      .leftJoinAndSelect('assessment.user', 'user')

    if (query.userId) {
      qb.andWhere('assessment.userId = :userId', { userId: query.userId })
    }

    if (query.domain) {
      qb.andWhere('assessment.domain ILIKE :domain', {
        domain: `%${query.domain}%`
      })
    }

    if (query.status) {
      qb.andWhere('assessment.status = :status', { status: query.status })
    }

    if (query.difficulty) {
      qb.andWhere('assessment.difficulty = :difficulty', {
        difficulty: query.difficulty
      })
    }

    if (query.isSharedWithAll !== undefined) {
      qb.andWhere('assessment.isSharedWithAll = :isSharedWithAll', {
        isSharedWithAll: query.isSharedWithAll
      })
    }

    const sortField = query.sortBy || 'createdAt'
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'domain',
      'status',
      'difficulty'
    ]

    if (allowedSortFields.includes(sortField)) {
      qb.orderBy(`assessment.${sortField}`, query.sortOrder || 'DESC')
    } else {
      qb.orderBy('assessment.createdAt', 'DESC')
    }

    const [assessments, total] = await qb
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    const data = assessments.map((assessment) => this.toResponseDto(assessment))

    return new PaginatedResponseDto(
      data,
      total,
      query.page ?? 1,
      query.limit ?? 20
    )
  }

  async findOne(id: string): Promise<AdminAssessmentDetailResponseDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id },
      relations: ['user']
    })

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`)
    }

    const [shareCount, answeredCount, result] = await Promise.all([
      this.assessmentSharesRepository.count({ where: { assessmentId: id } }),
      this.assessmentResponsesRepository.count({ where: { assessmentId: id } }),
      this.assessmentResultsRepository.findOne({ where: { assessmentId: id } })
    ])

    return plainToInstance(
      AdminAssessmentDetailResponseDto,
      {
        id: assessment.id,
        domain: assessment.domain,
        difficulty: assessment.difficulty,
        questionCount: assessment.questionCount,
        status: assessment.status,
        isSharedWithAll: assessment.isSharedWithAll,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        owner: this.toOwnerDto(assessment.user),
        shareCount,
        answeredCount,
        result: result
          ? {
              score: result.score,
              totalQuestions: result.totalQuestions,
              correctAnswers: result.correctCount,
              completedAt: result.completedAt
            }
          : undefined
      },
      { excludeExtraneousValues: true }
    )
  }

  async remove(id: string): Promise<void> {
    const result = await this.assessmentsRepository.delete(id)

    if (!result.affected) {
      throw new NotFoundException(`Assessment with ID ${id} not found`)
    }
  }

  private toResponseDto(assessment: Assessment): AdminAssessmentResponseDto {
    return plainToInstance(
      AdminAssessmentResponseDto,
      {
        id: assessment.id,
        domain: assessment.domain,
        difficulty: assessment.difficulty,
        questionCount: assessment.questionCount,
        status: assessment.status,
        isSharedWithAll: assessment.isSharedWithAll,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        owner: this.toOwnerDto(assessment.user)
      },
      { excludeExtraneousValues: true }
    )
  }

  private toOwnerDto(user: Assessment['user']): AssessmentOwnerDto {
    return plainToInstance(
      AssessmentOwnerDto,
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      { excludeExtraneousValues: true }
    )
  }
}
