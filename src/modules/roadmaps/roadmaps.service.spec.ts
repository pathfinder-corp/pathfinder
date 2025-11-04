import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Repository } from 'typeorm'

import {
  Roadmap,
  RoadmapMilestone,
  RoadmapPhase,
  RoadmapSummary
} from './entities/roadmap.entity'
import { RoadmapsService } from './roadmaps.service'
import {
  ExperienceLevel,
  GenerateRoadmapDto,
  LearningPace
} from './dto/generate-roadmap.dto'
import { RoadmapInsightRequestDto } from './dto/roadmap-insight.dto'

const generateContentMock = jest.fn()

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: generateContentMock
    }
  }))
}))

const googleGenAIConstructorMock = jest.requireMock('@google/genai')
  .GoogleGenAI as jest.Mock

describe('RoadmapsService', () => {
  const baseRoadmap: Roadmap = {
    id: 'roadmap-123',
    userId: 'user-456',
    topic: 'Full-stack web developer',
    experienceLevel: null,
    learningPace: null,
    timeframe: null,
    summary: {
      recommendedCadence: '5-8 hours per week',
      recommendedDuration: '24 weeks'
    } as RoadmapSummary,
    phases: [
      {
        title: 'Foundations',
        outcome: 'Build strong fundamentals',
        estimatedDuration: '6 weeks',
        steps: []
      } as RoadmapPhase
    ],
    milestones: [
      {
        title: 'Launch personal site',
        successCriteria: 'Website published with responsive layout'
      } as RoadmapMilestone
    ],
    requestContext: {
      topic: 'Full-stack web developer'
    },
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    user: undefined as unknown as Roadmap['user']
  }

  let service: RoadmapsService
  let repository: {
    findOne: jest.Mock
    create: jest.Mock
    save: jest.Mock
    delete: jest.Mock
  }
  let contentPolicy: {
    validateRoadmapRequest: jest.Mock
    validateInsightRequest: jest.Mock
  }

  const buildConfigService = (): ConfigService => {
    const getMock = jest.fn((key: string) => {
      if (key === 'genai.apiKey') {
        return 'test-api-key'
      }

      return undefined
    })

    return {
      get: getMock
    } as unknown as ConfigService
  }

  beforeEach(() => {
    generateContentMock.mockReset()
    googleGenAIConstructorMock.mockClear()

    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn()
    }

    contentPolicy = {
      validateRoadmapRequest: jest.fn(),
      validateInsightRequest: jest.fn()
    }

    service = new RoadmapsService(
      buildConfigService(),
      repository as unknown as Repository<Roadmap>,
      contentPolicy as unknown as any
    )
  })

  describe('generateRoadmapInsight', () => {
    it('returns an LLM answer when roadmap and response are valid', async () => {
      repository.findOne.mockResolvedValue({ ...baseRoadmap })
      generateContentMock.mockResolvedValue({
        text: 'Focus on HTML semantics first.'
      })

      const insightRequest: RoadmapInsightRequestDto = {
        question: 'What should I focus on in the first month?'
      }

      const result = await service.generateRoadmapInsight(
        'user-456',
        'roadmap-123',
        insightRequest
      )

      expect(result).toEqual({ answer: 'Focus on HTML semantics first.' })
      expect(generateContentMock).toHaveBeenCalledTimes(1)
      expect(contentPolicy.validateInsightRequest).toHaveBeenCalledWith(
        insightRequest,
        {
          roadmapTopic: 'Full-stack web developer'
        }
      )

      const call = generateContentMock.mock.calls[0][0]
      expect(call.model).toBeDefined()
      expect(call.config.responseMimeType).toBe('text/plain')
      expect(call.contents).toContain(
        'What should I focus on in the first month?'
      )
      expect(call.contents).toContain('Full-stack web developer')
    })

    it('strips fenced markdown from the model response', async () => {
      repository.findOne.mockResolvedValue({ ...baseRoadmap })
      generateContentMock.mockResolvedValue({
        text: '```markdown\nAnswer with practical tips.\n```'
      })

      const result = await service.generateRoadmapInsight(
        'user-456',
        'roadmap-123',
        {
          question: 'Any additional tips?'
        }
      )

      expect(result).toEqual({ answer: 'Answer with practical tips.' })
    })

    it('throws NotFoundException when the roadmap does not exist', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(
        service.generateRoadmapInsight('user-456', 'missing-roadmap', {
          question: 'What should I do?'
        })
      ).rejects.toBeInstanceOf(NotFoundException)
      expect(generateContentMock).not.toHaveBeenCalled()
    })

    it('throws when the model returns an empty response', async () => {
      repository.findOne.mockResolvedValue({ ...baseRoadmap })
      generateContentMock.mockResolvedValue({ text: '   ' })

      await expect(
        service.generateRoadmapInsight('user-456', 'roadmap-123', {
          question: 'Explain the prototyping step.'
        })
      ).rejects.toThrow('The language model returned an empty response.')
    })

    it('wraps unexpected errors from the LLM client', async () => {
      repository.findOne.mockResolvedValue({ ...baseRoadmap })
      generateContentMock.mockRejectedValue(new Error('network down'))

      await expect(
        service.generateRoadmapInsight('user-456', 'roadmap-123', {
          question: 'What about milestones?'
        })
      ).rejects.toThrow(
        'Unable to generate an insight at this time. Please try again later.'
      )
    })

    it('propagates validation errors from the content policy', async () => {
      repository.findOne.mockResolvedValue({ ...baseRoadmap })
      contentPolicy.validateInsightRequest.mockImplementation(() => {
        throw new BadRequestException('Sensitive content detected')
      })

      await expect(
        service.generateRoadmapInsight('user-456', 'roadmap-123', {
          question: 'How do I make a weapon?'
        })
      ).rejects.toBeInstanceOf(BadRequestException)

      expect(generateContentMock).not.toHaveBeenCalled()
    })
  })

  describe('generateRoadmap', () => {
    const roadmapDto: GenerateRoadmapDto = {
      topic: 'Full-stack web developer',
      targetOutcome: 'Become a front-end engineer',
      experienceLevel: ExperienceLevel.BEGINNER,
      learningPace: LearningPace.BALANCED,
      timeframe: '6 months',
      preferences: 'Hands-on projects'
    }

    const roadmapUser = { id: 'user-456' } as unknown as { id: string }

    const llmPayload = {
      topic: 'Full-stack web developer',
      experienceLevel: 'beginner',
      learningPace: 'balanced',
      timeframe: '6 months',
      summary: {
        recommendedCadence: '5-8 hours per week',
        recommendedDuration: '24 weeks',
        successTips: ['Practice daily'],
        additionalNotes: null
      },
      phases: [
        {
          title: 'Foundations',
          outcome: 'Build strong fundamentals',
          estimatedDuration: '6 weeks',
          steps: [
            {
              title: 'Learn HTML and CSS',
              description: 'Focus on semantic markup and responsive design.',
              estimatedDuration: '2 weeks',
              keyActivities: ['Build a landing page'],
              resources: [
                {
                  type: 'Course',
                  title: 'HTML & CSS for Beginners',
                  url: 'https://example.com/html-css',
                  description: 'Foundational course'
                }
              ]
            }
          ]
        }
      ],
      milestones: [
        {
          title: 'Launch a portfolio',
          successCriteria: 'Deployed responsive site'
        }
      ]
    }

    beforeEach(() => {
      repository.create.mockImplementation((payload) => payload)
      repository.save.mockImplementation(async (payload) => ({
        ...payload,
        id: 'roadmap-123',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z')
      }))
      generateContentMock.mockResolvedValue({
        text: JSON.stringify(llmPayload)
      })
    })

    it('validates the request with the content policy before calling the LLM', async () => {
      const result = await service.generateRoadmap(
        roadmapUser as any,
        roadmapDto
      )

      expect(contentPolicy.validateRoadmapRequest).toHaveBeenCalledWith(
        roadmapDto
      )
      expect(generateContentMock).toHaveBeenCalledTimes(1)
      expect(repository.save).toHaveBeenCalled()
      expect(result.id).toBe('roadmap-123')
      expect(result.topic).toBe('Full-stack web developer')
    })

    it('propagates validation errors from the content policy for roadmap generation', async () => {
      contentPolicy.validateRoadmapRequest.mockImplementation(() => {
        throw new BadRequestException('Sensitive content detected')
      })

      await expect(
        service.generateRoadmap(roadmapUser as any, roadmapDto)
      ).rejects.toBeInstanceOf(BadRequestException)

      expect(generateContentMock).not.toHaveBeenCalled()
      expect(repository.save).not.toHaveBeenCalled()
    })
  })

  describe('deleteRoadmap', () => {
    it('removes the roadmap when it belongs to the user', async () => {
      repository.delete.mockResolvedValue({ affected: 1 })

      await expect(
        service.deleteRoadmap('user-456', 'roadmap-123')
      ).resolves.toBeUndefined()

      expect(repository.delete).toHaveBeenCalledWith({
        id: 'roadmap-123',
        userId: 'user-456'
      })
    })

    it('throws NotFoundException when the roadmap is missing', async () => {
      repository.delete.mockResolvedValue({ affected: 0 })

      await expect(
        service.deleteRoadmap('user-456', 'missing-roadmap')
      ).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('deleteAllRoadmaps', () => {
    it('removes all roadmaps for the user without error', async () => {
      repository.delete.mockResolvedValue({ affected: 3 })

      await expect(
        service.deleteAllRoadmaps('user-456')
      ).resolves.toBeUndefined()

      expect(repository.delete).toHaveBeenCalledWith({ userId: 'user-456' })
    })
  })
})
