import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { User } from '../users/entities/user.entity'
import { AssessmentSharingService } from './assessment-sharing.service'
import { AssessmentShare } from './entities/assessment-share.entity'
import { Assessment, AssessmentDifficulty } from './entities/assessment.entity'

describe('AssessmentSharingService', () => {
  let service: AssessmentSharingService
  let assessmentsRepository: Repository<Assessment>
  let sharesRepository: Repository<AssessmentShare>

  const mockAssessment: Assessment = {
    id: 'assessment-123',
    userId: 'user-123',
    domain: 'JavaScript',
    difficulty: AssessmentDifficulty.MEDIUM,
    questionCount: 15,
    status: 'pending' as any,
    isSharedWithAll: false,
    createdAt: new Date(),
    updatedAt: new Date()
  } as Assessment

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentSharingService,
        {
          provide: getRepositoryToken(Assessment),
          useValue: {
            findOne: jest.fn(),
            exist: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: getRepositoryToken(AssessmentShare),
          useValue: {
            find: jest.fn(),
            delete: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn()
          }
        }
      ]
    }).compile()

    service = module.get<AssessmentSharingService>(AssessmentSharingService)
    assessmentsRepository = module.get<Repository<Assessment>>(
      getRepositoryToken(Assessment)
    )
    sharesRepository = module.get<Repository<AssessmentShare>>(
      getRepositoryToken(AssessmentShare)
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getShareState', () => {
    it('should return sharing state for assessment', async () => {
      jest
        .spyOn(assessmentsRepository, 'findOne')
        .mockResolvedValue(mockAssessment)
      jest.spyOn(sharesRepository, 'find').mockResolvedValue([])

      const result = await service.getShareState('user-123', 'assessment-123')

      expect(result).toEqual({
        isSharedWithAll: false,
        sharedWithUserIds: []
      })
    })

    it('should throw NotFoundException when assessment not found', async () => {
      jest.spyOn(assessmentsRepository, 'findOne').mockResolvedValue(null)

      await expect(
        service.getShareState('user-123', 'assessment-123')
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('revokeShare', () => {
    it('should revoke share access', async () => {
      jest.spyOn(assessmentsRepository, 'exist').mockResolvedValue(true)
      jest.spyOn(sharesRepository, 'delete').mockResolvedValue({
        affected: 1,
        raw: {}
      } as any)

      await service.revokeShare('user-123', 'assessment-123', 'user-456')

      expect(sharesRepository.delete).toHaveBeenCalledWith({
        assessmentId: 'assessment-123',
        sharedWithUserId: 'user-456'
      })
    })

    it('should throw NotFoundException when share not found', async () => {
      jest.spyOn(assessmentsRepository, 'exist').mockResolvedValue(true)
      jest.spyOn(sharesRepository, 'delete').mockResolvedValue({
        affected: 0,
        raw: {}
      } as any)

      await expect(
        service.revokeShare('user-123', 'assessment-123', 'user-456')
      ).rejects.toThrow('Shared user not found for assessment')
    })
  })
})
