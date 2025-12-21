import { Injectable, Logger } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'

import { MentorProfileResponseDto } from '../mentor-profiles/dto/mentor-profile-response.dto'
import { MentorProfilesService } from '../mentor-profiles/mentor-profiles.service'
import { StudentPreferencesService } from '../student-preferences/student-preferences.service'
import { RecommendedMentorDto } from './dto/recommendation-response.dto'
import { ScoringStrategy } from './interfaces/scoring-strategy.interface'
import { RuleBasedScoringStrategy } from './strategies/rule-based-scoring.strategy'

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name)
  private scoringStrategy: ScoringStrategy

  constructor(
    private readonly mentorProfilesService: MentorProfilesService,
    private readonly studentPreferencesService: StudentPreferencesService,
    private readonly ruleBasedStrategy: RuleBasedScoringStrategy
  ) {
    // Default to rule-based strategy
    this.scoringStrategy = ruleBasedStrategy
  }

  /**
   * Set the scoring strategy (useful for testing or feature flags)
   */
  setStrategy(strategy: ScoringStrategy): void {
    this.scoringStrategy = strategy
    this.logger.log(`Scoring strategy set to: ${strategy.getName()}`)
  }

  /**
   * Get recommended mentors for a student based on their preferences
   */
  async getRecommendations(
    userId: string,
    options?: {
      limit?: number
      minScore?: number
    }
  ): Promise<{
    recommendations: RecommendedMentorDto[]
    total: number
    strategy: string
  }> {
    const { limit = 10, minScore = 0 } = options ?? {}

    // Get student preferences
    const preferences =
      await this.studentPreferencesService.getPreferencesData(userId)

    // Get all available mentors
    const { mentors, total } = await this.mentorProfilesService.search({
      skip: 0,
      take: 100, // Get more to filter/sort
      limit: 100 // Get more to filter/sort
    })

    if (!preferences || Object.keys(preferences).length === 0) {
      // No preferences set - return mentors sorted by experience
      const defaultRecommendations = mentors.slice(0, limit).map((mentor) => ({
        score: 50,
        breakdown: {
          skillsMatch: 10,
          expertiseMatch: 10,
          languageMatch: 10,
          experienceMatch: 5
        },
        reasons: ['Set your preferences for personalized recommendations'],
        mentor: plainToInstance(MentorProfileResponseDto, mentor, {
          excludeExtraneousValues: true
        })
      }))

      return {
        recommendations: defaultRecommendations,
        total,
        strategy: 'default'
      }
    }

    // Score each mentor
    const scoredMentors = await Promise.all(
      mentors.map(async (mentor) => {
        const result = await this.scoringStrategy.score(preferences, mentor)
        return {
          mentor,
          ...result
        }
      })
    )

    // Filter by minimum score and sort by score descending
    const filtered = scoredMentors
      .filter((m) => m.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    const recommendations: RecommendedMentorDto[] = filtered.map((item) => ({
      score: item.score,
      breakdown: item.breakdown,
      reasons: item.reasons,
      mentor: plainToInstance(MentorProfileResponseDto, item.mentor, {
        excludeExtraneousValues: true
      })
    }))

    return {
      recommendations,
      total,
      strategy: this.scoringStrategy.getName()
    }
  }

  /**
   * Get a single mentor's match score against a student's preferences
   */
  async getMentorScore(
    userId: string,
    mentorId: string
  ): Promise<RecommendedMentorDto | null> {
    const preferences =
      await this.studentPreferencesService.getPreferencesData(userId)

    if (!preferences) {
      return null
    }

    const mentor = await this.mentorProfilesService.findById(mentorId)
    const result = await this.scoringStrategy.score(preferences, mentor)

    return {
      score: result.score,
      breakdown: result.breakdown,
      reasons: result.reasons,
      mentor: plainToInstance(MentorProfileResponseDto, mentor, {
        excludeExtraneousValues: true
      })
    }
  }
}
