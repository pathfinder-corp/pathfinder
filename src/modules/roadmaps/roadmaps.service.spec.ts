import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Repository } from 'typeorm'

import { User } from '../users/entities/user.entity'
import {
  ExperienceLevel,
  GenerateRoadmapDto,
  LearningPace
} from './dto/generate-roadmap.dto'
import { RoadmapInsightRequestDto } from './dto/roadmap-insight.dto'
import { RoadmapAccessType } from './dto/roadmap-response.dto'
import { RoadmapShareStateDto, ShareRoadmapDto } from './dto/share-roadmap.dto'
import { RoadmapShare } from './entities/roadmap-share.entity'
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
    isSharedWithAll: false,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    user: undefined as unknown as Roadmap['user']
  }

  let service: RoadmapsService
  let repository: {
    findOne: jest.Mock
    find: jest.Mock
    create: jest.Mock
    save: jest.Mock
    delete: jest.Mock
    exist: jest.Mock
    createQueryBuilder: jest.Mock
  }
  let roadmapSharesRepository: {
    find: jest.Mock
    delete: jest.Mock
    save: jest.Mock
    create: jest.Mock
    exist: jest.Mock
  }
  let usersRepository: {
    find: jest.Mock
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
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exist: jest.fn(),
      createQueryBuilder: jest.fn()
    }

    roadmapSharesRepository = {
      find: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(),
      create: jest.fn((payload) => payload),
      exist: jest.fn()
    }
    roadmapSharesRepository.find.mockResolvedValue([])
    roadmapSharesRepository.save.mockImplementation(
      async (entities) => entities
    )

    usersRepository = {
      find: jest.fn()
    }
    usersRepository.find.mockResolvedValue([])

    contentPolicy = {
      validateRoadmapRequest: jest.fn(),
      validateInsightRequest: jest.fn()
    }

    service = new RoadmapsService(
      buildConfigService(),
      repository as unknown as Repository<Roadmap>,
      roadmapSharesRepository as unknown as Repository<RoadmapShare>,
      usersRepository as unknown as Repository<User>,
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
      expect(result.accessType).toBe(RoadmapAccessType.OWNER)
      expect(result.isSharedWithAll).toBe(false)
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

  describe('getRoadmapById', () => {
    it('returns the roadmap for its owner with accessType OWNER', async () => {
      const ownerRoadmap = { ...baseRoadmap, userId: 'owner-1' }
      repository.findOne.mockResolvedValue(ownerRoadmap)

      const result = await service.getRoadmapById('owner-1', ownerRoadmap.id)

      expect(result.id).toBe(ownerRoadmap.id)
      expect(result.accessType).toBe(RoadmapAccessType.OWNER)
      expect(roadmapSharesRepository.exist).not.toHaveBeenCalled()
    })

    it('allows access for explicitly shared users with accessType SHARED', async () => {
      const sharedRoadmap = {
        ...baseRoadmap,
        userId: 'owner-1',
        isSharedWithAll: false
      }
      repository.findOne.mockResolvedValue(sharedRoadmap)
      roadmapSharesRepository.exist.mockResolvedValue(true)

      const result = await service.getRoadmapById('viewer-1', sharedRoadmap.id)

      expect(result.id).toBe(sharedRoadmap.id)
      expect(result.accessType).toBe(RoadmapAccessType.SHARED)
      expect(roadmapSharesRepository.exist).toHaveBeenCalledWith({
        where: {
          roadmapId: sharedRoadmap.id,
          sharedWithUserId: 'viewer-1'
        }
      })
    })

    it('allows access when the roadmap is shared with all users with accessType PUBLIC', async () => {
      const sharedWithAll = {
        ...baseRoadmap,
        userId: 'owner-1',
        isSharedWithAll: true
      }
      repository.findOne.mockResolvedValue(sharedWithAll)

      const result = await service.getRoadmapById('viewer-2', sharedWithAll.id)

      expect(result.id).toBe(sharedWithAll.id)
      expect(result.accessType).toBe(RoadmapAccessType.PUBLIC)
      expect(roadmapSharesRepository.exist).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when the requester lacks access', async () => {
      const privateRoadmap = {
        ...baseRoadmap,
        userId: 'owner-1',
        isSharedWithAll: false
      }
      repository.findOne.mockResolvedValue(privateRoadmap)
      roadmapSharesRepository.exist.mockResolvedValue(false)

      await expect(
        service.getRoadmapById('viewer-3', privateRoadmap.id)
      ).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('getSharedRoadmaps', () => {
    it('returns roadmaps explicitly shared with the user', async () => {
      const sharedRoadmap1 = {
        ...baseRoadmap,
        id: 'roadmap-1',
        userId: 'owner-1',
        topic: 'Shared Topic 1'
      }
      const sharedRoadmap2 = {
        ...baseRoadmap,
        id: 'roadmap-2',
        userId: 'owner-2',
        topic: 'Shared Topic 2'
      }

      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([sharedRoadmap1, sharedRoadmap2])
      }

      repository.createQueryBuilder.mockReturnValue(queryBuilder)

      const result = await service.getSharedRoadmaps('viewer-1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('roadmap-1')
      expect(result[0].accessType).toBe(RoadmapAccessType.SHARED)
      expect(result[1].id).toBe('roadmap-2')
      expect(result[1].accessType).toBe(RoadmapAccessType.SHARED)
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'share.sharedWithUserId = :userId',
        { userId: 'viewer-1' }
      )
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'roadmap.userId != :userId',
        { userId: 'viewer-1' }
      )
    })

    it('returns empty array when no roadmaps are shared with the user', async () => {
      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([])
      }

      repository.createQueryBuilder.mockReturnValue(queryBuilder)

      const result = await service.getSharedRoadmaps('viewer-1')

      expect(result).toEqual([])
    })
  })

  describe('getPublicRoadmaps', () => {
    it('returns roadmaps shared with all users excluding user own roadmaps', async () => {
      const publicRoadmap1 = {
        ...baseRoadmap,
        id: 'roadmap-1',
        userId: 'owner-1',
        topic: 'Public Topic 1',
        isSharedWithAll: true
      }
      const publicRoadmap2 = {
        ...baseRoadmap,
        id: 'roadmap-2',
        userId: 'owner-2',
        topic: 'Public Topic 2',
        isSharedWithAll: true
      }
      const ownPublicRoadmap = {
        ...baseRoadmap,
        id: 'roadmap-3',
        userId: 'viewer-1',
        topic: 'Own Public Roadmap',
        isSharedWithAll: true
      }

      repository.find.mockResolvedValue([
        publicRoadmap1,
        publicRoadmap2,
        ownPublicRoadmap
      ])

      const result = await service.getPublicRoadmaps('viewer-1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('roadmap-1')
      expect(result[0].accessType).toBe(RoadmapAccessType.PUBLIC)
      expect(result[1].id).toBe('roadmap-2')
      expect(result[1].accessType).toBe(RoadmapAccessType.PUBLIC)
      expect(repository.find).toHaveBeenCalledWith({
        where: {
          isSharedWithAll: true
        },
        order: { createdAt: 'DESC' }
      })
    })

    it('returns empty array when no public roadmaps exist', async () => {
      repository.find.mockResolvedValue([])

      const result = await service.getPublicRoadmaps('viewer-1')

      expect(result).toEqual([])
    })

    it('returns empty array when all public roadmaps belong to the user', async () => {
      const ownPublicRoadmap = {
        ...baseRoadmap,
        id: 'roadmap-1',
        userId: 'viewer-1',
        topic: 'Own Public Roadmap',
        isSharedWithAll: true
      }

      repository.find.mockResolvedValue([ownPublicRoadmap])

      const result = await service.getPublicRoadmaps('viewer-1')

      expect(result).toEqual([])
    })
  })

  describe('sharing state', () => {
    describe('getShareState', () => {
      it('returns the current sharing configuration', async () => {
        const roadmap = {
          ...baseRoadmap,
          userId: 'owner-1',
          isSharedWithAll: true
        }
        repository.findOne.mockResolvedValue(roadmap)
        roadmapSharesRepository.find.mockResolvedValueOnce([
          { sharedWithUserId: 'user-b' } as RoadmapShare,
          { sharedWithUserId: 'user-a' } as RoadmapShare
        ])

        const result = await service.getShareState('owner-1', roadmap.id)

        const expected: RoadmapShareStateDto = {
          isSharedWithAll: true,
          sharedWithUserIds: ['user-a', 'user-b']
        }

        expect(result).toEqual(expected)
      })

      it('throws NotFoundException when the roadmap does not exist', async () => {
        repository.findOne.mockResolvedValue(null)

        await expect(
          service.getShareState('owner-1', 'missing-roadmap')
        ).rejects.toBeInstanceOf(NotFoundException)
      })
    })

    describe('updateShareSettings', () => {
      it('updates recipients and toggles public sharing', async () => {
        const roadmap = {
          ...baseRoadmap,
          userId: 'owner-1',
          isSharedWithAll: false
        }
        repository.findOne.mockResolvedValue(roadmap)
        usersRepository.find.mockResolvedValue([
          { id: 'user-a' } as User,
          { id: 'user-b' } as User
        ])
        roadmapSharesRepository.find
          .mockResolvedValueOnce([
            { id: 'share-1', sharedWithUserId: 'user-x' } as RoadmapShare
          ])
          .mockResolvedValueOnce([
            { sharedWithUserId: 'user-a' } as RoadmapShare,
            { sharedWithUserId: 'user-b' } as RoadmapShare
          ])
        roadmapSharesRepository.delete.mockResolvedValue({ affected: 1 })

        const dto: ShareRoadmapDto = {
          shareWithAll: true,
          userIds: ['user-a', 'user-b']
        }

        const result = await service.updateShareSettings(
          'owner-1',
          roadmap.id,
          dto
        )

        expect(repository.save).toHaveBeenCalledWith(
          expect.objectContaining({ isSharedWithAll: true })
        )
        expect(roadmapSharesRepository.delete).toHaveBeenCalledWith(['share-1'])
        expect(roadmapSharesRepository.save).toHaveBeenCalledWith([
          {
            roadmapId: roadmap.id,
            sharedWithUserId: 'user-a'
          },
          {
            roadmapId: roadmap.id,
            sharedWithUserId: 'user-b'
          }
        ])
        expect(result).toEqual<RoadmapShareStateDto>({
          isSharedWithAll: true,
          sharedWithUserIds: ['user-a', 'user-b']
        })
      })

      it('removes explicit shares when the list is empty', async () => {
        const roadmap = {
          ...baseRoadmap,
          userId: 'owner-1',
          isSharedWithAll: false
        }
        repository.findOne.mockResolvedValue(roadmap)
        roadmapSharesRepository.find
          .mockResolvedValueOnce([
            { id: 'share-1', sharedWithUserId: 'user-a' } as RoadmapShare
          ])
          .mockResolvedValueOnce([])
        roadmapSharesRepository.delete.mockResolvedValue({ affected: 1 })

        const result = await service.updateShareSettings(
          'owner-1',
          roadmap.id,
          { userIds: [] }
        )

        expect(roadmapSharesRepository.delete).toHaveBeenCalledWith(['share-1'])
        expect(usersRepository.find).not.toHaveBeenCalled()
        expect(result).toEqual<RoadmapShareStateDto>({
          isSharedWithAll: false,
          sharedWithUserIds: []
        })
      })

      it('rejects updates that only include the owner as a recipient', async () => {
        const roadmap = {
          ...baseRoadmap,
          userId: 'owner-1',
          isSharedWithAll: false
        }
        repository.findOne.mockResolvedValue(roadmap)

        await expect(
          service.updateShareSettings('owner-1', roadmap.id, {
            userIds: ['owner-1']
          })
        ).rejects.toBeInstanceOf(BadRequestException)

        expect(roadmapSharesRepository.find).not.toHaveBeenCalled()
      })

      it('throws when any recipient cannot be found', async () => {
        const roadmap = {
          ...baseRoadmap,
          userId: 'owner-1',
          isSharedWithAll: false
        }
        repository.findOne.mockResolvedValue(roadmap)
        usersRepository.find.mockResolvedValue([{ id: 'user-a' } as User])

        await expect(
          service.updateShareSettings('owner-1', roadmap.id, {
            userIds: ['user-a', 'user-b']
          })
        ).rejects.toBeInstanceOf(NotFoundException)

        expect(roadmapSharesRepository.find).not.toHaveBeenCalled()
      })

      it('allows toggling shareWithAll without changing recipients', async () => {
        const roadmap = {
          ...baseRoadmap,
          userId: 'owner-1',
          isSharedWithAll: true
        }
        repository.findOne.mockResolvedValue(roadmap)
        roadmapSharesRepository.find.mockResolvedValueOnce([])

        const result = await service.updateShareSettings(
          'owner-1',
          roadmap.id,
          {
            shareWithAll: false
          }
        )

        expect(repository.save).toHaveBeenCalledWith(
          expect.objectContaining({ isSharedWithAll: false })
        )
        expect(roadmapSharesRepository.delete).not.toHaveBeenCalled()
        expect(result).toEqual<RoadmapShareStateDto>({
          isSharedWithAll: false,
          sharedWithUserIds: []
        })
      })

      it('throws NotFoundException when the roadmap is missing', async () => {
        repository.findOne.mockResolvedValue(null)

        await expect(
          service.updateShareSettings('owner-1', 'missing-roadmap', {
            userIds: ['user-a']
          })
        ).rejects.toBeInstanceOf(NotFoundException)
      })
    })
  })

  describe('revokeShare', () => {
    it('removes an existing share entry', async () => {
      repository.exist.mockResolvedValue(true)
      roadmapSharesRepository.delete.mockResolvedValue({ affected: 1 })

      await expect(
        service.revokeShare('owner-1', 'roadmap-123', 'user-a')
      ).resolves.toBeUndefined()

      expect(roadmapSharesRepository.delete).toHaveBeenCalledWith({
        roadmapId: 'roadmap-123',
        sharedWithUserId: 'user-a'
      })
    })

    it('throws when the share entry does not exist', async () => {
      repository.exist.mockResolvedValue(true)
      roadmapSharesRepository.delete.mockResolvedValue({ affected: 0 })

      await expect(
        service.revokeShare('owner-1', 'roadmap-123', 'user-a')
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    it('throws when the roadmap cannot be found for the owner', async () => {
      repository.exist.mockResolvedValue(false)

      await expect(
        service.revokeShare('owner-1', 'roadmap-123', 'user-a')
      ).rejects.toBeInstanceOf(NotFoundException)

      expect(roadmapSharesRepository.delete).not.toHaveBeenCalled()
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
