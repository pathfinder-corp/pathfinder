import { Test, TestingModule } from '@nestjs/testing'

import { MentorProfileResponseDto } from '../mentor-profiles/dto/mentor-profile-response.dto'
import { MentorProfile } from '../mentor-profiles/entities/mentor-profile.entity'
import { MentorProfilesService } from '../mentor-profiles/mentor-profiles.service'
import { StudentPreferenceData } from '../student-preferences/entities/student-preference.entity'
import { StudentPreferencesService } from '../student-preferences/student-preferences.service'
import { RecommendationsService } from './recommendations.service'
import { RuleBasedScoringStrategy } from './strategies/rule-based-scoring.strategy'

describe('RecommendationsService', () => {
  let service: RecommendationsService
  let mentorProfilesService: MentorProfilesService
  let studentPreferencesService: StudentPreferencesService

  const mockMentor: MentorProfile = {
    id: 'mentor-123',
    userId: 'user-mentor-123',
    headline: 'Senior Software Engineer',
    bio: 'Experienced developer',
    expertise: ['Software Engineering', 'System Design'],
    skills: ['TypeScript', 'Node.js', 'React', 'AWS'],
    industries: ['FinTech', 'Healthcare'],
    languages: ['English', 'Spanish'],
    yearsExperience: 10,
    isActive: true,
    isAcceptingMentees: true,
    createdAt: new Date(),
    updatedAt: new Date()
  } as MentorProfile

  const mockPreferences: StudentPreferenceData = {
    domains: ['Software Engineering'],
    goals: ['Get promoted to senior'],
    skills: ['TypeScript', 'System Design'],
    languages: ['English'],
    minYearsExperience: 5,
    industries: ['FinTech']
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        RuleBasedScoringStrategy,
        {
          provide: MentorProfilesService,
          useValue: {
            search: jest.fn(),
            findById: jest.fn()
          }
        },
        {
          provide: StudentPreferencesService,
          useValue: {
            getPreferencesData: jest.fn()
          }
        }
      ]
    }).compile()

    service = module.get<RecommendationsService>(RecommendationsService)
    mentorProfilesService = module.get<MentorProfilesService>(
      MentorProfilesService
    )
    studentPreferencesService = module.get<StudentPreferencesService>(
      StudentPreferencesService
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getRecommendations', () => {
    it('should return ranked recommendations based on preferences', async () => {
      jest
        .spyOn(studentPreferencesService, 'getPreferencesData')
        .mockResolvedValue(mockPreferences)
      jest.spyOn(mentorProfilesService, 'search').mockResolvedValue({
        mentors: [mockMentor],
        total: 1
      })

      const result = await service.getRecommendations('student-123')

      expect(result.recommendations).toBeDefined()
      expect(result.recommendations.length).toBeGreaterThan(0)
      expect(result.recommendations[0].score).toBeGreaterThan(0)
      expect(result.strategy).toBe('rule-based')
    })

    it('should return default recommendations when no preferences set', async () => {
      jest
        .spyOn(studentPreferencesService, 'getPreferencesData')
        .mockResolvedValue(null)
      jest.spyOn(mentorProfilesService, 'search').mockResolvedValue({
        mentors: [mockMentor],
        total: 1
      })

      const result = await service.getRecommendations('student-123')

      expect(result.recommendations).toBeDefined()
      expect(result.strategy).toBe('default')
    })

    it('should filter by minimum score', async () => {
      jest
        .spyOn(studentPreferencesService, 'getPreferencesData')
        .mockResolvedValue(mockPreferences)

      // Create a mentor with low match
      const lowMatchMentor = {
        ...mockMentor,
        id: 'mentor-456',
        skills: ['Python', 'Django'], // No overlap with preferences
        expertise: ['Data Science'], // Different domain
        languages: ['French'] // Different language
      }

      jest.spyOn(mentorProfilesService, 'search').mockResolvedValue({
        mentors: [mockMentor, lowMatchMentor],
        total: 2
      })

      const result = await service.getRecommendations('student-123', {
        minScore: 50
      })

      // Should only include high-matching mentor
      expect(result.recommendations.every((r) => r.score >= 50)).toBe(true)
    })

    it('should limit results', async () => {
      jest
        .spyOn(studentPreferencesService, 'getPreferencesData')
        .mockResolvedValue(mockPreferences)

      const mentors = Array(10)
        .fill(null)
        .map((_, i) => ({ ...mockMentor, id: `mentor-${i}` }))

      jest.spyOn(mentorProfilesService, 'search').mockResolvedValue({
        mentors,
        total: 10
      })

      const result = await service.getRecommendations('student-123', {
        limit: 5
      })

      expect(result.recommendations.length).toBeLessThanOrEqual(5)
    })
  })

  describe('getMentorScore', () => {
    it('should return score for specific mentor', async () => {
      jest
        .spyOn(studentPreferencesService, 'getPreferencesData')
        .mockResolvedValue(mockPreferences)
      jest
        .spyOn(mentorProfilesService, 'findById')
        .mockResolvedValue(mockMentor)

      const result = await service.getMentorScore('student-123', 'mentor-123')

      expect(result).toBeDefined()
      expect(result?.score).toBeGreaterThan(0)
      expect(result?.breakdown).toBeDefined()
      expect(result?.reasons).toBeDefined()
    })

    it('should return null when no preferences set', async () => {
      jest
        .spyOn(studentPreferencesService, 'getPreferencesData')
        .mockResolvedValue(null)

      const result = await service.getMentorScore('student-123', 'mentor-123')

      expect(result).toBeNull()
    })
  })
})

describe('RuleBasedScoringStrategy', () => {
  let strategy: RuleBasedScoringStrategy

  beforeEach(() => {
    strategy = new RuleBasedScoringStrategy()
  })

  it('should score skills match', async () => {
    const preferences: StudentPreferenceData = {
      skills: ['TypeScript', 'React']
    }

    const mentor: MentorProfile = {
      id: 'mentor-1',
      skills: ['TypeScript', 'React', 'Node.js'],
      expertise: [],
      industries: [],
      languages: [],
      modalities: []
    } as MentorProfile

    const result = await strategy.score(preferences, mentor)

    expect(result.breakdown.skillsMatch).toBeGreaterThan(0)
    expect(result.reasons.some((r) => r.includes('skills'))).toBe(true)
  })

  it('should score language match', async () => {
    const preferences: StudentPreferenceData = {
      languages: ['English', 'Spanish']
    }

    const mentor: MentorProfile = {
      id: 'mentor-1',
      skills: [],
      expertise: [],
      industries: [],
      languages: ['English'],
      modalities: []
    } as MentorProfile

    const result = await strategy.score(preferences, mentor)

    expect(result.breakdown.languageMatch).toBe(15)
    expect(result.reasons.some((r) => r.includes('English'))).toBe(true)
  })

  it('should score experience match', async () => {
    const preferences: StudentPreferenceData = {
      minYearsExperience: 5
    }

    const mentor: MentorProfile = {
      id: 'mentor-1',
      skills: [],
      expertise: [],
      industries: [],
      languages: [],
      modalities: [],
      yearsExperience: 10
    } as MentorProfile

    const result = await strategy.score(preferences, mentor)

    expect(result.breakdown.experienceMatch).toBe(10)
    expect(result.reasons.some((r) => r.includes('experience'))).toBe(true)
  })
})
