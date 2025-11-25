import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { AssessmentContentPolicyService } from './assessment-content-policy.service'
import { CreateAssessmentDto } from './dto/create-assessment.dto'
import { AssessmentDifficulty } from './entities/assessment.entity'

describe('AssessmentContentPolicyService', () => {
  let service: AssessmentContentPolicyService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssessmentContentPolicyService]
    }).compile()

    service = module.get<AssessmentContentPolicyService>(
      AssessmentContentPolicyService
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('validateAssessmentRequest', () => {
    it('should accept valid educational domains', () => {
      const validDtos: CreateAssessmentDto[] = [
        { domain: 'JavaScript programming' },
        { domain: 'Machine Learning fundamentals' },
        { domain: 'Data structures and algorithms' },
        { domain: 'Web development with React' }
      ]

      validDtos.forEach((dto) => {
        expect(() => service.validateAssessmentRequest(dto)).not.toThrow()
      })
    })

    it('should reject empty domain', () => {
      const dto: CreateAssessmentDto = { domain: '' }

      expect(() => service.validateAssessmentRequest(dto)).toThrow(
        BadRequestException
      )
    })

    it('should reject non-educational topics', () => {
      const invalidDtos: CreateAssessmentDto[] = [
        { domain: 'dating advice' },
        { domain: 'celebrity gossip' },
        { domain: 'astrology predictions' },
        { domain: 'gambling strategies' }
      ]

      invalidDtos.forEach((dto) => {
        expect(() => service.validateAssessmentRequest(dto)).toThrow(
          BadRequestException
        )
      })
    })

    it('should reject sensitive topics', () => {
      const sensitiveDtos: CreateAssessmentDto[] = [
        { domain: 'how to make a bomb' },
        { domain: 'weapon manufacturing' },
        { domain: 'self-harm techniques' }
      ]

      sensitiveDtos.forEach((dto) => {
        expect(() => service.validateAssessmentRequest(dto)).toThrow(
          BadRequestException
        )
      })
    })
  })

  describe('validateGeneratedQuestions', () => {
    it('should accept clean questions', () => {
      const questions = [
        { questionText: 'What is a variable in JavaScript?' },
        { questionText: 'Explain the concept of closures' }
      ]

      expect(() =>
        service.validateGeneratedQuestions(questions)
      ).not.toThrow()
    })

    it('should reject questions with sensitive content', () => {
      const questions = [
        { questionText: 'How to build a weapon using JavaScript?' }
      ]

      expect(() => service.validateGeneratedQuestions(questions)).toThrow(
        BadRequestException
      )
    })
  })
})


