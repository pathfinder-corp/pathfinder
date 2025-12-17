import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import { User } from '../users/entities/user.entity'
import {
  AssessmentShareStateDto,
  ShareAssessmentDto
} from './dto/share-assessment.dto'
import { AssessmentShare } from './entities/assessment-share.entity'
import { Assessment } from './entities/assessment.entity'

@Injectable()
export class AssessmentSharingService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentsRepository: Repository<Assessment>,
    @InjectRepository(AssessmentShare)
    private readonly sharesRepository: Repository<AssessmentShare>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  async getShareState(
    ownerId: string,
    assessmentId: string
  ): Promise<AssessmentShareStateDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId, userId: ownerId }
    })

    if (!assessment) {
      throw new NotFoundException('Assessment not found')
    }

    return await this.buildShareState(assessmentId, assessment.isSharedWithAll)
  }

  async updateShareSettings(
    ownerId: string,
    assessmentId: string,
    shareDto: ShareAssessmentDto
  ): Promise<AssessmentShareStateDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId, userId: ownerId }
    })

    if (!assessment) {
      throw new NotFoundException('Assessment not found')
    }

    if (typeof shareDto.shareWithAll === 'boolean') {
      assessment.isSharedWithAll = shareDto.shareWithAll
    }

    if (shareDto.userIds !== undefined) {
      const sanitizedUserIds = Array.from(
        new Set(
          shareDto.userIds
            .map((value) => value.trim())
            .filter((id) => id && id !== ownerId)
        )
      )

      if (shareDto.userIds.length > 0 && sanitizedUserIds.length === 0) {
        throw new BadRequestException(
          'At least one recipient must be a different user.'
        )
      }

      if (sanitizedUserIds.length > 0) {
        const users = await this.usersRepository.find({
          where: { id: In(sanitizedUserIds) }
        })

        if (users.length !== sanitizedUserIds.length) {
          throw new NotFoundException('One or more users could not be found.')
        }
      }

      const existingShares = await this.sharesRepository.find({
        where: { assessmentId },
        select: ['id', 'sharedWithUserId']
      })

      const targetIds = new Set(sanitizedUserIds)
      const existingMap = new Map(
        existingShares.map((share) => [share.sharedWithUserId, share.id])
      )

      const sharesToRemove = existingShares
        .filter((share) => !targetIds.has(share.sharedWithUserId))
        .map((share) => share.id)

      if (sharesToRemove.length > 0) {
        await this.sharesRepository.delete(sharesToRemove)
      }

      const sharesToAdd = sanitizedUserIds.filter(
        (userId) => !existingMap.has(userId)
      )

      if (sharesToAdd.length > 0) {
        await this.sharesRepository.save(
          sharesToAdd.map((sharedWithUserId) =>
            this.sharesRepository.create({
              assessmentId,
              sharedWithUserId
            })
          )
        )
      }
    }

    await this.assessmentsRepository.save(assessment)

    return await this.buildShareState(assessmentId, assessment.isSharedWithAll)
  }

  async revokeShare(
    ownerId: string,
    assessmentId: string,
    sharedWithUserId: string
  ): Promise<void> {
    const assessmentExists = await this.assessmentsRepository.exist({
      where: { id: assessmentId, userId: ownerId }
    })

    if (!assessmentExists) {
      throw new NotFoundException('Assessment not found')
    }

    const result = await this.sharesRepository.delete({
      assessmentId,
      sharedWithUserId
    })

    if (!result.affected) {
      throw new NotFoundException('Shared user not found for assessment')
    }
  }

  private async buildShareState(
    assessmentId: string,
    isSharedWithAll: boolean
  ): Promise<AssessmentShareStateDto> {
    const shareRecords = await this.sharesRepository.find({
      where: { assessmentId },
      select: ['sharedWithUserId']
    })

    const sharedWithUserIds = shareRecords
      .map((share) => share.sharedWithUserId)
      .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))

    return {
      isSharedWithAll,
      sharedWithUserIds
    }
  }
}
