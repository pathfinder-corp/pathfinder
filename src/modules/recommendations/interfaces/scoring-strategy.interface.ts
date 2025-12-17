import { MentorProfile } from '../../mentor-profiles/entities/mentor-profile.entity'
import { StudentPreferenceData } from '../../student-preferences/entities/student-preference.entity'

export interface ScoringResult {
  mentorId: string
  score: number
  breakdown: {
    skillsMatch: number
    expertiseMatch: number
    languageMatch: number
    experienceMatch: number
  }
  reasons: string[]
}

export interface ScoringStrategy {
  /**
   * Calculate a match score between a student's preferences and a mentor's profile
   * @param preferences Student's preferences
   * @param mentor Mentor's profile
   * @returns Score from 0-100 with breakdown
   */
  score(
    preferences: StudentPreferenceData,
    mentor: MentorProfile
  ): Promise<ScoringResult>

  /**
   * Get the name of this scoring strategy
   */
  getName(): string
}

export const SCORING_STRATEGY = Symbol('SCORING_STRATEGY')
