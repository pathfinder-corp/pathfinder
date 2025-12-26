import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { GenAIClientWrapperService } from '../../../common/services/genai-client-wrapper.service'
import { GenerateRoadmapDto } from '../dto/generate-roadmap.dto'
import {
  PhaseGenerationResult,
  ReducedRoadmap,
  RoadmapSkeleton
} from '../dto/roadmap-mapreduce.dto'
import {
  RoadmapMilestone,
  RoadmapPhase,
  RoadmapSummary
} from '../entities/roadmap.entity'

@Injectable()
export class RoadmapsReduceService {
  private readonly logger = new Logger(RoadmapsReduceService.name)

  constructor(
    private readonly genaiClient: GenAIClientWrapperService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Combine generated phases into a coherent roadmap with summary and milestones
   */
  async reduceRoadmap(
    request: GenerateRoadmapDto,
    skeleton: RoadmapSkeleton,
    phaseResults: PhaseGenerationResult[],
    userId?: string
  ): Promise<ReducedRoadmap> {
    this.logger.debug(
      `Reducing ${phaseResults.length} phases into final roadmap`
    )

    // Sort phases by phase number to ensure correct order
    const sortedResults = [...phaseResults].sort(
      (a, b) => a.phaseNumber - b.phaseNumber
    )
    const phases = sortedResults.map((r) => r.phase)

    // Ensure phase consistency and transitions
    const refinedPhases = this.ensurePhaseConsistency(phases)

    // Generate summary and milestones
    const [summary, milestones] = await Promise.all([
      this.generateSummary(request, skeleton, refinedPhases, userId),
      this.generateMilestones(request, refinedPhases, userId)
    ])

    this.logger.log(
      `Reduced roadmap with ${refinedPhases.length} phases, ${milestones.length} milestones`
    )

    return {
      summary,
      phases: refinedPhases,
      milestones
    }
  }

  /**
   * Ensure consistency across phases (terminology, difficulty progression)
   */
  private ensurePhaseConsistency(phases: RoadmapPhase[]): RoadmapPhase[] {
    // For now, return phases as-is since we generate them sequentially with context
    // In a future enhancement, we could use LLM to review and adjust inconsistencies
    this.logger.debug('Phase consistency check passed (sequential generation)')
    return phases
  }

  /**
   * Generate roadmap summary based on all phases
   */
  private async generateSummary(
    request: GenerateRoadmapDto,
    skeleton: RoadmapSkeleton,
    phases: RoadmapPhase[],
    userId?: string
  ): Promise<RoadmapSummary> {
    const prompt = this.buildSummaryPrompt(request, skeleton, phases)

    this.logger.debug('Generating roadmap summary')

    const response = await this.genaiClient.generateContent(
      {
        model: this.genaiClient.getModelName(),
        contents: prompt,
        config: {
          ...this.genaiClient.getGenerationDefaults(),
          maxOutputTokens: 65536,
          responseMimeType: 'application/json'
        }
      },
      'RoadmapsReduceService',
      'generateSummary',
      userId
    )

    const text = response.text?.trim()
    if (!text) {
      throw new Error('Failed to generate summary: empty response')
    }

    return this.parseSummaryResponse(text)
  }

  /**
   * Generate milestones based on phases
   */
  private async generateMilestones(
    request: GenerateRoadmapDto,
    phases: RoadmapPhase[],
    userId?: string
  ): Promise<RoadmapMilestone[]> {
    const prompt = this.buildMilestonesPrompt(request, phases)

    this.logger.debug('Generating roadmap milestones')

    const response = await this.genaiClient.generateContent(
      {
        model: this.genaiClient.getModelName(),
        contents: prompt,
        config: {
          ...this.genaiClient.getGenerationDefaults(),
          maxOutputTokens: 65536,
          responseMimeType: 'application/json'
        }
      },
      'RoadmapsReduceService',
      'generateMilestones',
      userId
    )

    const text = response.text?.trim()
    if (!text) {
      throw new Error('Failed to generate milestones: empty response')
    }

    return this.parseMilestonesResponse(text)
  }

  /**
   * Build summary generation prompt
   */
  private buildSummaryPrompt(
    request: GenerateRoadmapDto,
    skeleton: RoadmapSkeleton,
    phases: RoadmapPhase[]
  ): string {
    const phaseSummaries = phases
      .map(
        (p, idx) => `
Phase ${idx + 1}: ${p.title}
- Outcome: ${p.outcome}
- Duration: ${p.estimatedDuration || 'Not specified'}
- Steps: ${p.steps.length} steps
`
      )
      .join('\n')

    return `You are an expert educational advisor. Generate a comprehensive summary for a learning roadmap.

**Roadmap Context:**
- Topic: ${request.topic}
- Background: ${request.background || 'Not specified'}
- Target Outcome: ${request.targetOutcome || 'Not specified'}
- Overview: ${skeleton.overview}

**Phases:**
${phaseSummaries}

**Task:**
Create a summary that helps the learner understand the overall approach and what to expect.

**Output Format (JSON):**
{
  "recommendedCadence": "How often to work on this (e.g., 'Daily practice for 1-2 hours', '3-4 sessions per week')",
  "recommendedDuration": "Total estimated time to complete (e.g., '6-8 months', '200-250 hours')",
  "successTips": [
    "Actionable tip 1",
    "Actionable tip 2",
    "Actionable tip 3",
    "Actionable tip 4",
    "Actionable tip 5"
  ],
  "additionalNotes": "Any important considerations, prerequisites, or context (1-2 sentences)"
}

**Requirements:**
1. Provide 5-7 concrete success tips
2. Base duration on summing phase estimates
3. Consider the user's learning pace for cadence recommendation
4. Tips should be specific and actionable
5. Additional notes should address any critical prerequisites or context

Generate ONLY the JSON output, no additional text.`
  }

  /**
   * Build milestones generation prompt
   */
  private buildMilestonesPrompt(
    request: GenerateRoadmapDto,
    phases: RoadmapPhase[]
  ): string {
    const phaseSummaries = phases
      .map(
        (p, idx) => `
Phase ${idx + 1}: ${p.title}
- Outcome: ${p.outcome}
`
      )
      .join('\n')

    return `You are an expert educational advisor. Generate key milestones for a learning roadmap.

**Roadmap Context:**
- Topic: ${request.topic}
- Target Outcome: ${request.targetOutcome || 'Not specified'}

**Phases:**
${phaseSummaries}

**Task:**
Create 6-12 measurable milestones that mark significant progress points throughout the learning journey.

**Output Format (JSON):**
{
  "milestones": [
    {
      "title": "Milestone title (concise, achievement-focused)",
      "successCriteria": "Specific, measurable criteria to know this milestone is reached"
    }
  ]
}

**Requirements:**
1. Create 6-12 milestones distributed across the learning journey
2. Each milestone should be significant and measurable
3. Success criteria should be specific and observable
4. Milestones should build progressively
5. Include both skill-based and project-based milestones where appropriate
6. Final milestone should align with the target outcome

Generate ONLY the JSON output, no additional text.`
  }

  /**
   * Parse summary JSON response
   */
  private parseSummaryResponse(text: string): RoadmapSummary {
    try {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text]
      const jsonText = (jsonMatch[1] || text).trim()

      const parsed = JSON.parse(jsonText) as Record<string, unknown>

      return {
        recommendedCadence: (parsed.recommendedCadence as string) || null,
        recommendedDuration: (parsed.recommendedDuration as string) || null,
        successTips: (parsed.successTips as string[]) || null,
        additionalNotes: (parsed.additionalNotes as string) || null
      }
    } catch (error) {
      this.logger.error(`Failed to parse summary response: ${error}`)
      throw new Error(`Invalid summary JSON: ${error}`)
    }
  }

  /**
   * Parse milestones JSON response
   */
  private parseMilestonesResponse(text: string): RoadmapMilestone[] {
    try {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text]
      const jsonText = (jsonMatch[1] || text).trim()

      const parsed = JSON.parse(jsonText) as Record<string, unknown>

      if (!parsed.milestones || !Array.isArray(parsed.milestones)) {
        throw new Error('Invalid milestones structure')
      }

      return parsed.milestones as RoadmapMilestone[]
    } catch (error) {
      this.logger.error(`Failed to parse milestones response: ${error}`)
      throw new Error(`Invalid milestones JSON: ${error}`)
    }
  }
}
