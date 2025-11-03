import { InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Repository } from 'typeorm'

import {
  Roadmap,
  RoadmapMilestone,
  RoadmapPhase,
  RoadmapSummary
} from './entities/roadmap.entity'
import { RoadmapsService } from './roadmaps.service'

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

describe('RoadmapsService (insights)', () => {
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
  let repository: { findOne: jest.Mock }

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
      findOne: jest.fn()
    }

    service = new RoadmapsService(
      buildConfigService(),
      repository as unknown as Repository<Roadmap>
    )
  })

  it('returns an LLM answer when roadmap and response are valid', async () => {
    repository.findOne.mockResolvedValue({ ...baseRoadmap })
    generateContentMock.mockResolvedValue({
      text: 'Focus on HTML semantics first.'
    })

    const result = await service.generateRoadmapInsight(
      'user-456',
      'roadmap-123',
      {
        question: 'What should I focus on in the first month?'
      }
    )

    expect(result).toEqual({ answer: 'Focus on HTML semantics first.' })
    expect(generateContentMock).toHaveBeenCalledTimes(1)

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
})
