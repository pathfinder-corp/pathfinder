import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { GenAIClientWrapperService } from '../../../common/services/genai-client-wrapper.service'
import { ExperienceLevel, LearningPace } from '../dto/generate-roadmap.dto'
import {
  PhaseGenerationContext,
  PhaseGenerationResult,
  RoadmapSkeleton
} from '../dto/roadmap-mapreduce.dto'
import { RoadmapPhase } from '../entities/roadmap.entity'

@Injectable()
export class RoadmapsMapService {
  private readonly logger = new Logger(RoadmapsMapService.name)

  constructor(
    private readonly genaiClient: GenAIClientWrapperService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Generate a high-level roadmap skeleton before phase expansion
   */
  async generateSkeleton(
    context: Omit<PhaseGenerationContext, 'phaseNumber' | 'previousPhases'>,
    userId?: string
  ): Promise<RoadmapSkeleton> {
    const { request, totalPhases } = context

    const prompt = this.buildSkeletonPrompt(request, totalPhases)

    this.logger.debug(`Generating roadmap skeleton for topic: ${request.topic}`)

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
      'RoadmapsMapService',
      'generateSkeleton',
      userId
    )

    const text = response.text?.trim()
    if (!text) {
      throw new Error('Failed to generate roadmap skeleton: empty response')
    }

    const skeleton = this.parseSkeletonResponse(text)
    this.logger.log(
      `Generated skeleton with ${skeleton.phaseOutlines.length} phases`
    )

    return skeleton
  }

  /**
   * Generate a single phase with context from previous phases
   */
  async generatePhase(
    context: PhaseGenerationContext,
    userId?: string,
    retryCount = 0
  ): Promise<PhaseGenerationResult> {
    const { phaseNumber, totalPhases, request, previousPhases, skeleton } =
      context

    this.logger.debug(
      `Generating phase ${phaseNumber}/${totalPhases} for topic: ${request.topic}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`
    )

    const prompt = this.buildPhasePrompt(
      request,
      phaseNumber,
      totalPhases,
      previousPhases,
      skeleton
    )

    const startTime = Date.now()

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
      'RoadmapsMapService',
      'generatePhase',
      userId
    )

    const duration = Date.now() - startTime

    const text = response.text?.trim()
    if (!text) {
      throw new Error(`Failed to generate phase ${phaseNumber}: empty response`)
    }

    const phase = this.parsePhaseResponse(text)

    const result: PhaseGenerationResult = {
      phaseNumber,
      phase,
      tokensUsed: response.usageMetadata?.totalTokenCount || undefined,
      generatedAt: new Date(),
      retryCount
    }

    this.logger.log(
      `Generated phase ${phaseNumber}/${totalPhases} in ${duration}ms (${result.tokensUsed || 0} tokens)`
    )

    return result
  }

  /**
   * Build skeleton generation prompt
   */
  private buildSkeletonPrompt(
    request: PhaseGenerationContext['request'],
    totalPhases: number
  ): string {
    const experienceContext = this.getExperienceContext(request.experienceLevel)
    const paceContext = this.getPaceContext(request.learningPace)
    const timeframeContext = request.timeframe
      ? `The user has a timeframe of: ${request.timeframe}`
      : 'No specific timeframe provided'

    return `You are an expert educational roadmap architect. Generate a high-level skeleton for a learning roadmap.

**Request Context:**
- Topic: ${request.topic}
- Background: ${request.background || 'Not specified'}
- Target Outcome: ${request.targetOutcome || 'Not specified'}
- Experience Level: ${experienceContext}
- Learning Pace: ${paceContext}
- Timeframe: ${timeframeContext}
- Preferences: ${request.preferences || 'Not specified'}

**Task:**
Generate a roadmap skeleton with ${totalPhases} distinct learning phases. This skeleton will guide the detailed expansion of each phase later.

**Output Format (JSON):**
{
  "overview": "Brief 2-3 sentence overview of the complete learning journey",
  "phaseOutlines": [
    {
      "title": "Phase title",
      "outcome": "What the learner will achieve after completing this phase",
      "estimatedDuration": "Approximate time to complete this phase"
    }
  ],
  "terminology": {
    "key_concept_1": "Consistent term to use throughout",
    "key_concept_2": "Consistent term to use throughout"
  }
}

**Requirements:**
1. Create ${totalPhases} progressive phases that build on each other
2. Each phase should have a clear, distinct focus area
3. Outcomes should be specific and measurable
4. Terminology should ensure consistency across all phases
5. Consider the user's experience level when determining starting point
6. Align phase duration estimates with the user's pace and timeframe

Generate ONLY the JSON output, no additional text.`
  }

  /**
   * Build phase-specific generation prompt
   */
  private buildPhasePrompt(
    request: PhaseGenerationContext['request'],
    phaseNumber: number,
    totalPhases: number,
    previousPhases: RoadmapPhase[],
    skeleton?: RoadmapSkeleton
  ): string {
    const experienceContext = this.getExperienceContext(request.experienceLevel)
    const paceContext = this.getPaceContext(request.learningPace)

    const skeletonContext = skeleton
      ? `
**Roadmap Overview:**
${skeleton.overview}

**Current Phase Outline:**
${JSON.stringify(skeleton.phaseOutlines[phaseNumber - 1], null, 2)}

**Terminology to Use:**
${JSON.stringify(skeleton.terminology || {}, null, 2)}
`
      : ''

    const previousContext =
      previousPhases.length > 0
        ? `
**Previously Completed Phases:**
${previousPhases
  .map(
    (p, idx) => `
Phase ${idx + 1}: ${p.title}
- Outcome: ${p.outcome}
- Steps: ${p.steps.length} steps covering ${p.steps.map((s) => s.title).join(', ')}
`
  )
  .join('\n')}

**Important:** This phase (${phaseNumber}) should build upon the knowledge and skills from previous phases. Reference earlier concepts where appropriate and ensure progression.
`
        : `**Note:** This is the first phase, so establish foundational concepts clearly.`

    return `You are an expert educational content creator. Generate a detailed learning phase for a roadmap.

**Request Context:**
- Topic: ${request.topic}
- Background: ${request.background || 'Not specified'}
- Target Outcome: ${request.targetOutcome || 'Not specified'}
- Experience Level: ${experienceContext}
- Learning Pace: ${paceContext}
- Preferences: ${request.preferences || 'Not specified'}
${skeletonContext}
**Current Task:**
Generate detailed content for Phase ${phaseNumber} of ${totalPhases}.
${previousContext}

**Output Format (JSON):**
{
  "title": "Phase title (clear and engaging)",
  "outcome": "Specific learning outcome for this phase",
  "estimatedDuration": "Time estimate (e.g., '2-3 weeks', '40-50 hours')",
  "steps": [
    {
      "title": "Step title",
      "description": "Detailed description of what to do in this step (2-4 sentences)",
      "estimatedDuration": "Time for this step",
      "keyActivities": ["Activity 1", "Activity 2", "Activity 3", "Activity 4"],
      "resources": [
        {
          "type": "course|book|article|video|tool|practice|documentation",
          "title": "Resource title",
          "url": "https://example.com (if available)",
          "description": "Why this resource is valuable"
        }
      ]
    }
  ]
}

**Requirements:**
1. Include 4-8 steps for this phase
2. Each step should be actionable and specific
3. Include 4-6 key activities per step
4. Provide 4-6 high-quality resources per step (mix of types)
5. Resources should be real and well-known (courses, books, articles, tools)
6. Ensure logical progression within the phase
7. Maintain consistency with ${previousPhases.length > 0 ? 'previous phases and' : ''} the terminology guide
8. Align detail level with the user's experience level and learning pace

Generate ONLY the JSON output, no additional text.`
  }

  /**
   * Parse skeleton JSON response
   */
  private parseSkeletonResponse(text: string): RoadmapSkeleton {
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text]
      const jsonText = (jsonMatch[1] || text).trim()

      const parsed = JSON.parse(jsonText) as Record<string, unknown>

      if (
        !parsed.overview ||
        !parsed.phaseOutlines ||
        !Array.isArray(parsed.phaseOutlines)
      ) {
        throw new Error('Invalid skeleton structure')
      }

      return {
        overview: parsed.overview as string,
        phaseOutlines: parsed.phaseOutlines as RoadmapSkeleton['phaseOutlines'],
        terminology: (parsed.terminology as Record<string, string>) || {}
      }
    } catch (error) {
      this.logger.error(`Failed to parse skeleton response: ${error}`)
      throw new Error(`Invalid skeleton JSON: ${error}`)
    }
  }

  /**
   * Parse phase JSON response
   */
  private parsePhaseResponse(text: string): RoadmapPhase {
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text]
      const jsonText = (jsonMatch[1] || text).trim()

      const parsed = JSON.parse(jsonText) as Record<string, unknown>

      if (!parsed.title || !parsed.outcome || !parsed.steps) {
        throw new Error('Invalid phase structure')
      }

      // Validate steps structure
      if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
        throw new Error('Phase must have at least one step')
      }

      return {
        title: parsed.title as string,
        outcome: parsed.outcome as string,
        estimatedDuration: (parsed.estimatedDuration as string) || null,
        steps: parsed.steps as RoadmapPhase['steps']
      }
    } catch (error) {
      this.logger.error(`Failed to parse phase response: ${error}`)
      throw new Error(`Invalid phase JSON: ${error}`)
    }
  }

  /**
   * Get experience level context string
   */
  private getExperienceContext(level?: ExperienceLevel): string {
    switch (level) {
      case ExperienceLevel.BEGINNER:
        return 'Beginner - needs foundational concepts explained clearly'
      case ExperienceLevel.INTERMEDIATE:
        return 'Intermediate - has some background, can handle moderate complexity'
      case ExperienceLevel.ADVANCED:
        return 'Advanced - experienced, focus on advanced topics and best practices'
      default:
        return 'Not specified - assume intermediate level'
    }
  }

  /**
   * Get learning pace context string
   */
  private getPaceContext(pace?: LearningPace): string {
    switch (pace) {
      case LearningPace.FLEXIBLE:
        return 'Flexible pace - self-directed, with time for deep exploration'
      case LearningPace.BALANCED:
        return 'Balanced pace - steady progress with reasonable time commitments'
      case LearningPace.INTENSIVE:
        return 'Intensive pace - accelerated learning with focused effort'
      default:
        return 'Not specified - assume balanced pace'
    }
  }
}
