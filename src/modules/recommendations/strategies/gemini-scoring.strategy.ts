import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { MentorProfile } from '../../mentor-profiles/entities/mentor-profile.entity'
import { StudentPreferenceData } from '../../student-preferences/entities/student-preference.entity'
import {
  ScoringResult,
  ScoringStrategy
} from '../interfaces/scoring-strategy.interface'
import { RuleBasedScoringStrategy } from './rule-based-scoring.strategy'

/**
 * Gemini-assisted scoring strategy (stub implementation)
 *
 * This is a placeholder for future Gemini AI integration.
 * Currently falls back to rule-based scoring.
 *
 * To implement Gemini scoring:
 * 1. Import @google/genai
 * 2. Use the genai config from app.config.ts
 * 3. Create a prompt that describes student preferences and mentor profile
 * 4. Ask Gemini to score compatibility and provide reasoning
 * 5. Parse the response and return ScoringResult
 *
 * Example prompt structure:
 * ```
 * You are a mentorship matching assistant. Score how well this mentor matches
 * the student's preferences on a scale of 0-100.
 *
 * Student Preferences:
 * - Domains: ${preferences.domains}
 * - Skills to develop: ${preferences.skills}
 * - Goals: ${preferences.goals}
 * ...
 *
 * Mentor Profile:
 * - Expertise: ${mentor.expertise}
 * - Skills: ${mentor.skills}
 * - Experience: ${mentor.yearsExperience} years
 * ...
 *
 * Respond with JSON: { score: number, reasons: string[] }
 * ```
 */
@Injectable()
export class GeminiScoringStrategy implements ScoringStrategy {
  private readonly logger = new Logger(GeminiScoringStrategy.name)
  private readonly enabled: boolean

  constructor(
    private readonly configService: ConfigService,
    private readonly fallbackStrategy: RuleBasedScoringStrategy
  ) {
    // Check if Gemini is configured and enabled
    const apiKey = this.configService.get<string>('genai.apiKey')
    this.enabled = !!apiKey && apiKey.length > 0

    if (!this.enabled) {
      this.logger.warn(
        'Gemini scoring is disabled (no API key). Using rule-based fallback.'
      )
    }
  }

  getName(): string {
    return 'gemini-ai'
  }

  async score(
    preferences: StudentPreferenceData,
    mentor: MentorProfile
  ): Promise<ScoringResult> {
    if (!this.enabled) {
      // Fall back to rule-based scoring
      return this.fallbackStrategy.score(preferences, mentor)
    }

    // TODO: Implement actual Gemini integration
    // For now, use rule-based with a note that Gemini will be added
    this.logger.debug(
      `Gemini scoring requested for mentor ${mentor.id} - using fallback`
    )

    const result = await this.fallbackStrategy.score(preferences, mentor)

    // Add note that this would be AI-enhanced
    result.reasons.unshift('AI-enhanced matching (placeholder)')

    return result
  }

  /**
   * Future implementation hint:
   *
   * async scoreWithGemini(
   *   preferences: StudentPreferenceData,
   *   mentor: MentorProfile
   * ): Promise<ScoringResult> {
   *   const { GoogleGenAI } = await import('@google/genai')
   *
   *   const genai = new GoogleGenAI({
   *     apiKey: this.configService.get('genai.apiKey')
   *   })
   *
   *   const model = genai.getGenerativeModel({
   *     model: this.configService.get('genai.model')
   *   })
   *
   *   const prompt = this.buildPrompt(preferences, mentor)
   *   const result = await model.generateContent(prompt)
   *
   *   return this.parseGeminiResponse(mentor.id, result)
   * }
   */
}
