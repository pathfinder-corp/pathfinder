import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { User } from '../users/entities/user.entity'
import { AssessmentContentPolicyService } from './assessment-content-policy.service'
import { AssessmentsService } from './assessments.service'
import { CreateAssessmentDto } from './dto/create-assessment.dto'
import { AssessmentQuestion } from './entities/assessment-question.entity'
import { AssessmentResponse } from './entities/assessment-response.entity'
import { AssessmentShare } from './entities/assessment-share.entity'
import {
  Assessment,
  AssessmentDifficulty,
  AssessmentStatus
} from './entities/assessment.entity'

describe('AssessmentsService', () => {
  let service: AssessmentsService
  let assessmentsRepository: Repository<Assessment>
  let questionsRepository: Repository<AssessmentQuestion>
  let responsesRepository: Repository<AssessmentResponse>

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashed',
    firstName: 'Test',
    lastName: 'User',
    role: 'student' as any,
    status: 'active' as any,
    createdAt: new Date(),
    updatedAt: new Date()
  } as User

  const mockAssessment: Assessment = {
    id: 'assessment-123',
    userId: 'user-123',
    domain: 'JavaScript',
    difficulty: AssessmentDifficulty.MEDIUM,
    questionCount: 15,
    status: AssessmentStatus.PENDING,
    isSharedWithAll: false,
    createdAt: new Date(),
    updatedAt: new Date()
  } as Assessment

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'genai.apiKey': 'test-api-key',
                'genai.model': 'gemini-2.5-flash',
                'genai.temperature': 0.4,
                'genai.topP': 0.95,
                'genai.topK': 32,
                'genai.maxOutputTokens': 32768
              }
              return config[key]
            })
          }
        },
        {
          provide: getRepositoryToken(Assessment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn()
          }
        },
        {
          provide: getRepositoryToken(AssessmentQuestion),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn()
          }
        },
        {
          provide: getRepositoryToken(AssessmentResponse),
          useValue: {
            count: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: getRepositoryToken(AssessmentShare),
          useValue: {
            exist: jest.fn()
          }
        },
        {
          provide: AssessmentContentPolicyService,
          useValue: {
            validateAssessmentRequest: jest.fn(),
            validateGeneratedQuestions: jest.fn()
          }
        }
      ]
    }).compile()

    service = module.get<AssessmentsService>(AssessmentsService)
    assessmentsRepository = module.get<Repository<Assessment>>(
      getRepositoryToken(Assessment)
    )
    questionsRepository = module.get<Repository<AssessmentQuestion>>(
      getRepositoryToken(AssessmentQuestion)
    )
    responsesRepository = module.get<Repository<AssessmentResponse>>(
      getRepositoryToken(AssessmentResponse)
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getUserAssessments', () => {
    it('should return user assessments with answered counts', async () => {
      const assessments = [mockAssessment]

      jest.spyOn(assessmentsRepository, 'find').mockResolvedValue(assessments)
      jest.spyOn(responsesRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([])
      } as any)

      const result = await service.getUserAssessments('user-123')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(assessmentsRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        relations: ['questions'],
        order: { createdAt: 'DESC' }
      })
    })
  })

  describe('deleteAssessment', () => {
    it('should delete assessment when user is owner', async () => {
      jest.spyOn(assessmentsRepository, 'delete').mockResolvedValue({
        affected: 1,
        raw: {}
      } as any)

      await service.deleteAssessment('user-123', 'assessment-123')

      expect(assessmentsRepository.delete).toHaveBeenCalledWith({
        id: 'assessment-123',
        userId: 'user-123'
      })
    })

    it('should throw NotFoundException when assessment not found', async () => {
      jest.spyOn(assessmentsRepository, 'delete').mockResolvedValue({
        affected: 0,
        raw: {}
      } as any)

      await expect(
        service.deleteAssessment('user-123', 'assessment-123')
      ).rejects.toThrow('Assessment not found')
    })
  })

  describe('cleanOptionText', () => {
    it('should remove letter prefixes from options', () => {
      const testCases = [
        { input: 'A. Answer text', expected: 'Answer text' },
        { input: 'B) Another answer', expected: 'Another answer' },
        { input: 'C. Option here', expected: 'Option here' },
        { input: 'a. lowercase prefix', expected: 'lowercase prefix' }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = service['cleanOptionText'](input)
        expect(result).toBe(expected)
      })
    })

    it('should remove number prefixes from options', () => {
      const testCases = [
        { input: '1. First option', expected: 'First option' },
        { input: '2) Second option', expected: 'Second option' },
        { input: '10. Tenth option', expected: 'Tenth option' }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = service['cleanOptionText'](input)
        expect(result).toBe(expected)
      })
    })

    it('should remove roman numeral prefixes from options', () => {
      const testCases = [
        { input: 'i. First', expected: 'First' },
        { input: 'ii. Second', expected: 'Second' },
        { input: 'iv. Fourth', expected: 'Fourth' }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = service['cleanOptionText'](input)
        expect(result).toBe(expected)
      })
    })

    it('should remove bullet points from options', () => {
      const testCases = [
        { input: '• Bullet point', expected: 'Bullet point' },
        { input: '- Dash point', expected: 'Dash point' },
        { input: '* Asterisk point', expected: 'Asterisk point' }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = service['cleanOptionText'](input)
        expect(result).toBe(expected)
      })
    })

    it('should handle options without prefixes', () => {
      const input = 'Plain text option'
      const result = service['cleanOptionText'](input)
      expect(result).toBe('Plain text option')
    })

    it('should trim whitespace', () => {
      const input = '  A.   Text with spaces  '
      const result = service['cleanOptionText'](input)
      expect(result).toBe('Text with spaces')
    })
  })
})
