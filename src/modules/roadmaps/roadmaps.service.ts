import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { In, Repository } from 'typeorm'

import { GenAIClientWrapperService } from '../../common/services/genai-client-wrapper.service'
import { User, UserRole } from '../users/entities/user.entity'
import {
  ExperienceLevel,
  GenerateRoadmapDto,
  LearningPace
} from './dto/generate-roadmap.dto'
import {
  RoadmapInsightRequestDto,
  RoadmapInsightResponseDto
} from './dto/roadmap-insight.dto'
import {
  RoadmapAccessType,
  RoadmapContentDto,
  RoadmapResponseDto
} from './dto/roadmap-response.dto'
import { RoadmapShareStateDto, ShareRoadmapDto } from './dto/share-roadmap.dto'
import { SharedUserDto } from './dto/shared-user.dto'
import { RoadmapShare } from './entities/roadmap-share.entity'
import {
  Roadmap,
  RoadmapRequestContext,
  RoadmapSummary
} from './entities/roadmap.entity'
import { RoadmapContentPolicyService } from './roadmap-content-policy.service'

type RoadmapContentPlain = {
  topic: string
  experienceLevel?: ExperienceLevel | null
  learningPace?: LearningPace | null
  timeframe?: string | null
  summary: RoadmapSummary
  phases: Roadmap['phases']
  milestones?: Roadmap['milestones']
}

const SYSTEM_PROMPT = `You are an expert academic and career advisor. Build comprehensive, actionable roadmaps that combine skill acquisition, experiential learning, and milestone tracking.

IMPORTANT: Generate extremely detailed, thorough, and verbose roadmaps that maximize the use of available output tokens. Every phase, activity, milestone, and resource should include extensive descriptions, context, and actionable guidance.

Rules:
- Always respond with valid JSON that matches the provided schema.
- Do not use Markdown formatting, code blocks, or any special formatting in your response.
- BE MAXIMALLY DETAILED: Provide in-depth explanations for every phase, activity, and milestone. Include extensive context, rationale, learning objectives, expected outcomes, and practical tips.
- For each activity: Include detailed descriptions (3-5 sentences minimum), specific resources with full context, time estimates, skill prerequisites, and expected learning outcomes.
- For milestones: Provide comprehensive success criteria, validation methods, and detailed guidance on how to achieve them.
- For resources: Include full descriptions of why each resource is valuable, what the learner will gain, and how it fits into the overall learning path.
- Expand all sections to their maximum useful length while maintaining relevance and actionability.
- Decline any request that is not focused on educational growth or that touches sensitive or harmful topics (violence, weapons, self-harm, adult content, hate, or illegal activities). Respond with: "I'm sorry, but I can only help with educational learning plans."
- Never produce content that facilitates dangerous, hateful, or illegal activities.`

const INSIGHT_SYSTEM_PROMPT = `You are an expert mentor helping learners understand and apply their personalized roadmap. Provide grounded, encouraging, and precise answers that reference the supplied roadmap data. If information is missing or unclear, say so and suggest what the learner could clarify.

Safety rules:
- Only address educational or skill-building questions related to the roadmap.
- If the learner asks about sensitive or harmful topics (violence, weapons, self-harm, adult content, hate, or illegal activities), respond with: "I'm sorry, but I can only help with educational learning plans."
- Do not generate guidance that could cause harm or break laws.`

@Injectable()
export class RoadmapsService {
  private readonly logger = new Logger(RoadmapsService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly genaiClient: GenAIClientWrapperService,
    @InjectRepository(Roadmap)
    private readonly roadmapsRepository: Repository<Roadmap>,
    @InjectRepository(RoadmapShare)
    private readonly roadmapSharesRepository: Repository<RoadmapShare>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly contentPolicy: RoadmapContentPolicyService
  ) {}

  async generateRoadmap(
    user: User,
    generateRoadmapDto: GenerateRoadmapDto
  ): Promise<RoadmapResponseDto> {
    this.contentPolicy.validateRoadmapRequest(generateRoadmapDto)

    const prompt = this.buildPrompt(generateRoadmapDto)

    try {
      const response = await this.genaiClient.generateContent(
        {
          model: this.genaiClient.getModelName(),
          contents: prompt,
          config: {
            ...this.genaiClient.getGenerationDefaults(),
            responseMimeType: 'application/json',
            systemInstruction: SYSTEM_PROMPT
          }
        },
        'roadmaps',
        'generate_roadmap',
        user.id
      )

      const textResponse = response.text?.trim()

      if (!textResponse) {
        throw new InternalServerErrorException(
          'The language model returned an empty response.'
        )
      }

      const parsedPayload = this.parseModelOutput(textResponse)

      const roadmapContent = plainToInstance(RoadmapContentDto, parsedPayload, {
        enableImplicitConversion: true
      })

      const roadmapPlain = instanceToPlain(roadmapContent, {
        exposeUnsetFields: false
      }) as RoadmapContentPlain

      if (
        !roadmapPlain.summary ||
        !Array.isArray(roadmapPlain.phases) ||
        roadmapPlain.phases.length === 0
      ) {
        throw new InternalServerErrorException(
          'The language model returned an empty response.'
        )
      }

      const savedRoadmap = await this.roadmapsRepository.save(
        this.roadmapsRepository.create({
          userId: user.id,
          topic: roadmapPlain.topic,
          experienceLevel: roadmapPlain.experienceLevel ?? null,
          learningPace: roadmapPlain.learningPace ?? null,
          timeframe: roadmapPlain.timeframe ?? null,
          summary: roadmapPlain.summary,
          phases: roadmapPlain.phases,
          milestones: roadmapPlain.milestones ?? null,
          requestContext: this.buildRequestContext(generateRoadmapDto),
          isSharedWithAll: false
        })
      )

      // Attach user relation for response transformation
      savedRoadmap.user = user

      return this.toRoadmapResponse(savedRoadmap, RoadmapAccessType.OWNER)
    } catch (error) {
      this.logger.error(
        'Failed to generate roadmap',
        error instanceof Error ? error.stack : undefined
      )

      if (error instanceof InternalServerErrorException) {
        throw error
      }

      throw new InternalServerErrorException(
        'Unable to generate a roadmap at this time. Please try again later.'
      )
    }
  }

  async getUserRoadmaps(userId: string): Promise<RoadmapResponseDto[]> {
    const roadmaps = await this.roadmapsRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    })

    return roadmaps.map((roadmap) =>
      this.toRoadmapResponse(roadmap, RoadmapAccessType.OWNER)
    )
  }

  async getSharedRoadmaps(userId: string): Promise<RoadmapResponseDto[]> {
    const roadmaps = await this.roadmapsRepository
      .createQueryBuilder('roadmap')
      .innerJoin('roadmap.shares', 'share')
      .leftJoinAndSelect('roadmap.user', 'user')
      .where('share.sharedWithUserId = :userId', { userId })
      .andWhere('roadmap.userId != :userId', { userId })
      .orderBy('roadmap.createdAt', 'DESC')
      .getMany()

    return roadmaps.map((roadmap) =>
      this.toRoadmapResponse(roadmap, RoadmapAccessType.SHARED)
    )
  }

  async getPublicRoadmaps(userId: string): Promise<RoadmapResponseDto[]> {
    const roadmaps = await this.roadmapsRepository.find({
      where: {
        isSharedWithAll: true
      },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    })

    const filteredRoadmaps = roadmaps.filter(
      (roadmap) => roadmap.userId !== userId
    )

    return filteredRoadmaps.map((roadmap) =>
      this.toRoadmapResponse(roadmap, RoadmapAccessType.PUBLIC)
    )
  }

  async getRoadmapById(
    userId: string,
    roadmapId: string,
    userRole: UserRole
  ): Promise<RoadmapResponseDto> {
    const roadmap = await this.roadmapsRepository.findOne({
      where: { id: roadmapId },
      relations: ['user']
    })

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found')
    }

    // Admins can access all roadmaps
    if (userRole === UserRole.ADMIN) {
      return this.toRoadmapResponse(roadmap, RoadmapAccessType.ADMIN)
    }

    const isOwner = roadmap.userId === userId
    let accessType: RoadmapAccessType

    if (isOwner) {
      accessType = RoadmapAccessType.OWNER
    } else {
      if (roadmap.isSharedWithAll) {
        accessType = RoadmapAccessType.PUBLIC
      } else {
        const hasAccess = await this.roadmapSharesRepository.exist({
          where: {
            roadmapId,
            sharedWithUserId: userId
          }
        })

        if (!hasAccess) {
          throw new NotFoundException('Roadmap not found')
        }

        accessType = RoadmapAccessType.SHARED
      }
    }

    return this.toRoadmapResponse(roadmap, accessType)
  }

  async deleteRoadmap(userId: string, roadmapId: string): Promise<void> {
    const result = await this.roadmapsRepository.delete({
      id: roadmapId,
      userId
    })

    if (!result.affected) {
      throw new NotFoundException('Roadmap not found')
    }
  }

  async deleteAllRoadmaps(userId: string): Promise<void> {
    await this.roadmapsRepository.delete({ userId })
  }

  async generateRoadmapInsight(
    userId: string,
    roadmapId: string,
    insightDto: RoadmapInsightRequestDto
  ): Promise<RoadmapInsightResponseDto> {
    const roadmap = await this.roadmapsRepository.findOne({
      where: { id: roadmapId, userId }
    })

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found')
    }

    this.contentPolicy.validateInsightRequest(insightDto, {
      roadmapTopic: roadmap.topic
    })

    const prompt = this.buildInsightPrompt(roadmap, insightDto)

    try {
      const response = await this.genaiClient.generateContent(
        {
          model: this.genaiClient.getModelName(),
          contents: prompt,
          config: {
            ...this.genaiClient.getInsightGenerationDefaults(),
            responseMimeType: 'text/plain',
            systemInstruction: INSIGHT_SYSTEM_PROMPT
          }
        },
        'roadmaps',
        'generate_insight',
        userId
      )

      const textResponse = response.text?.trim()

      if (!textResponse) {
        throw new InternalServerErrorException(
          'The language model returned an empty response.'
        )
      }

      return {
        answer: this.sanitizeModelText(textResponse)
      }
    } catch (error) {
      this.logger.error(
        'Failed to generate roadmap insight',
        error instanceof Error ? error.stack : undefined
      )

      if (error instanceof InternalServerErrorException) {
        throw error
      }

      throw new InternalServerErrorException(
        'Unable to generate an insight at this time. Please try again later.'
      )
    }
  }

  async getShareState(
    ownerId: string,
    roadmapId: string
  ): Promise<RoadmapShareStateDto> {
    const roadmap = await this.roadmapsRepository.findOne({
      where: { id: roadmapId, userId: ownerId }
    })

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found')
    }

    return await this.buildRoadmapShareState(roadmapId, roadmap.isSharedWithAll)
  }

  async updateShareSettings(
    ownerId: string,
    roadmapId: string,
    shareDto: ShareRoadmapDto
  ): Promise<RoadmapShareStateDto> {
    const roadmap = await this.roadmapsRepository.findOne({
      where: { id: roadmapId, userId: ownerId }
    })

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found')
    }

    if (typeof shareDto.shareWithAll === 'boolean') {
      roadmap.isSharedWithAll = shareDto.shareWithAll
    }

    if (shareDto.userIds !== undefined) {
      const sanitizedUserIds = Array.from(
        new Set(
          shareDto.userIds
            .map((value) => value.trim())
            .filter((id) => id && id !== ownerId)
        )
      )

      if (shareDto.userIds.length > 0 && sanitizedUserIds.length === 0) {
        throw new BadRequestException(
          'At least one recipient must be a different user.'
        )
      }

      if (sanitizedUserIds.length > 0) {
        const users = await this.usersRepository.find({
          where: { id: In(sanitizedUserIds) }
        })

        if (users.length !== sanitizedUserIds.length) {
          throw new NotFoundException('One or more users could not be found.')
        }
      }

      const existingShares = await this.roadmapSharesRepository.find({
        where: { roadmapId },
        select: ['id', 'sharedWithUserId']
      })

      const targetIds = new Set(sanitizedUserIds)
      const existingMap = new Map(
        existingShares.map((share) => [share.sharedWithUserId, share.id])
      )

      const sharesToRemove = existingShares
        .filter((share) => !targetIds.has(share.sharedWithUserId))
        .map((share) => share.id)

      if (sharesToRemove.length > 0) {
        await this.roadmapSharesRepository.delete(sharesToRemove)
      }

      const sharesToAdd = sanitizedUserIds.filter(
        (userId) => !existingMap.has(userId)
      )

      if (sharesToAdd.length > 0) {
        await this.roadmapSharesRepository.save(
          sharesToAdd.map((sharedWithUserId) =>
            this.roadmapSharesRepository.create({
              roadmapId,
              sharedWithUserId
            })
          )
        )
      }
    }

    await this.roadmapsRepository.save(roadmap)

    return await this.buildRoadmapShareState(roadmapId, roadmap.isSharedWithAll)
  }

  async revokeShare(
    ownerId: string,
    roadmapId: string,
    sharedWithUserId: string
  ): Promise<void> {
    const roadmapExists = await this.roadmapsRepository.exist({
      where: { id: roadmapId, userId: ownerId }
    })

    if (!roadmapExists) {
      throw new NotFoundException('Roadmap not found')
    }

    const result = await this.roadmapSharesRepository.delete({
      roadmapId,
      sharedWithUserId
    })

    if (!result.affected) {
      throw new NotFoundException('Shared user not found for roadmap')
    }
  }

  async getSharedUsers(
    ownerId: string,
    roadmapId: string
  ): Promise<SharedUserDto[]> {
    const roadmapExists = await this.roadmapsRepository.exist({
      where: { id: roadmapId, userId: ownerId }
    })

    if (!roadmapExists) {
      throw new NotFoundException('Roadmap not found')
    }

    const shares = await this.roadmapSharesRepository.find({
      where: { roadmapId },
      relations: ['sharedWith'],
      order: { createdAt: 'DESC' }
    })

    return shares.map((share) => ({
      id: share.sharedWith.id,
      email: share.sharedWith.email,
      firstName: share.sharedWith.firstName,
      lastName: share.sharedWith.lastName,
      avatar: share.sharedWith.avatar,
      sharedAt: share.createdAt.toISOString()
    }))
  }

  private async buildRoadmapShareState(
    roadmapId: string,
    isSharedWithAll: boolean
  ): Promise<RoadmapShareStateDto> {
    const shareRecords = await this.roadmapSharesRepository.find({
      where: { roadmapId },
      select: ['sharedWithUserId']
    })

    const sharedWithUserIds = shareRecords
      .map((share) => share.sharedWithUserId)
      .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))

    return {
      isSharedWithAll,
      sharedWithUserIds
    }
  }

  private buildRequestContext(dto: GenerateRoadmapDto): RoadmapRequestContext {
    return {
      topic: dto.topic,
      background: dto.background ?? null,
      targetOutcome: dto.targetOutcome ?? null,
      experienceLevel: dto.experienceLevel ?? null,
      learningPace: dto.learningPace ?? null,
      timeframe: dto.timeframe ?? null,
      preferences: dto.preferences ?? null
    }
  }

  private toRoadmapResponse(
    roadmap: Roadmap,
    accessType: RoadmapAccessType
  ): RoadmapResponseDto {
    return plainToInstance(
      RoadmapResponseDto,
      {
        id: roadmap.id,
        topic: roadmap.topic,
        experienceLevel: roadmap.experienceLevel ?? undefined,
        learningPace: roadmap.learningPace ?? undefined,
        timeframe: roadmap.timeframe ?? undefined,
        summary: roadmap.summary,
        phases: roadmap.phases,
        milestones: roadmap.milestones ?? undefined,
        accessType,
        isSharedWithAll: roadmap.isSharedWithAll,
        owner: {
          id: roadmap.user.id,
          email: roadmap.user.email,
          firstName: roadmap.user.firstName,
          lastName: roadmap.user.lastName,
          avatar: roadmap.user.avatar
        },
        createdAt: roadmap.createdAt.toISOString(),
        updatedAt: roadmap.updatedAt.toISOString()
      },
      {
        enableImplicitConversion: true
      }
    )
  }

  private buildPrompt(dto: GenerateRoadmapDto): string {
    const context: string[] = [
      `Topic or goal: ${dto.topic}`,
      dto.experienceLevel
        ? `Experience level: ${this.formatEnumValue(dto.experienceLevel)}`
        : null,
      dto.learningPace
        ? `Preferred learning pace: ${this.formatEnumValue(dto.learningPace)}`
        : null,
      dto.background ? `Background: ${dto.background}` : null,
      dto.targetOutcome ? `Target outcome: ${dto.targetOutcome}` : null,
      dto.timeframe ? `Timeframe: ${dto.timeframe}` : null,
      dto.preferences ? `Additional preferences: ${dto.preferences}` : null
    ].filter((value): value is string => Boolean(value))

    return `Create a personalized learning roadmap that helps the user achieve their stated goal.

    Context:
    ${context.map((line) => `- ${line}`).join('\n')}

    IMPORTANT: Generate an extremely comprehensive and detailed roadmap that maximizes the use of all available output tokens. Every section should be expansive, thorough, and provide substantial value.

    Instructions:
    - Break the roadmap into 4-8 sequential phases for comprehensive coverage.
    - For each phase, provide COMPREHENSIVE information:
      * A clear, descriptive title (8-12 words) that captures the phase's focus
      * An extensive description (4-6 sentences) explaining what the phase covers, its importance, and how it fits in the overall journey
      * Detailed outcome statement (2-3 sentences) describing what the learner will achieve by completing this phase
      * Realistic estimated duration with justification
      * 3-5 specific learning objectives that detail what skills, knowledge, or competencies will be gained
      * 2-4 key skills that will be developed during this phase
      * Prerequisites or recommended preparation before starting this phase (2-3 items)
    - Each phase must include 4-8 detailed steps that build upon each other progressively.
    - Structure phases from foundational concepts to advanced mastery, ensuring logical skill progression with clear prerequisites and dependencies.
    - For each step, BE MAXIMALLY DETAILED:
      * Write a clear, specific title that precisely indicates what will be learned (8-12 words)
      * Provide an EXTENSIVE description (5-8 sentences minimum) that thoroughly explains:
        - The core learning objectives and why they matter
        - How this step connects to previous and subsequent steps
        - What specific skills, concepts, or competencies will be developed
        - Real-world applications and practical benefits
        - Common pitfalls or challenges learners should be aware of
      * Include 5-8 concrete, specific key activities with detailed explanations of what to do and expected outcomes
      * Add 4-6 diverse, high-quality resources with COMPREHENSIVE descriptions:
        - For each resource, explain in 2-3 sentences: what it covers, why it's valuable, what the learner will gain, and how it fits into the overall learning path
        - Include varied resource types: interactive courses, textbooks, documentation, hands-on projects, video tutorials, articles, practice platforms, community forums
        - Provide specific, actionable resource recommendations (actual course names, book titles, platforms)
      * Specify realistic estimated duration with reasoning (e.g., "2-3 weeks assuming 10 hours/week because...")
      * Include practical tips for success specific to this step
      * Ensure each step has clear, measurable deliverables and success criteria
    - Provide an EXTREMELY comprehensive summary with extensive detail:
      * Recommended study cadence with detailed reasoning and flexibility options (3-4 sentences)
      * Total recommended duration broken down by phase with justification
      * 8-12 detailed success tips (each 2-3 sentences) covering:
        - Study strategies and learning techniques
        - Time management and consistency tips
        - How to stay motivated and overcome challenges
        - Community engagement and networking advice
        - Tool and resource recommendations
        - Practice and application strategies
        - Progress tracking methods
        - When and how to seek help
      * Extensive additional notes (4-6 sentences) covering prerequisites, expected challenges, career outcomes, certification options, community resources, and next steps beyond the roadmap
    - Include 6-12 comprehensive milestone checkpoints spread strategically across the roadmap:
      * Each milestone should have a clear, specific title
      * Success criteria should be detailed (3-5 specific, measurable criteria per milestone)
      * Include guidance on how to validate achievement and what to do if struggling

    Output JSON schema:
    {
      "topic": string,
      "experienceLevel": "beginner" | "intermediate" | "advanced" | null,
      "learningPace": "flexible" | "balanced" | "intensive" | null,
      "timeframe": string | null,
      "summary": {
        "recommendedCadence": string | null,
        "recommendedDuration": string | null,
        "successTips": string[] | null,
        "additionalNotes": string | null
      },
      "phases": [
        {
          "title": string,
          "description": string,
          "outcome": string,
          "estimatedDuration": string | null,
          "objectives": string[] | null,
          "keySkills": string[] | null,
          "prerequisites": string[] | null,
          "steps": [
            {
              "title": string,
              "description": string,
              "estimatedDuration": string | null,
              "keyActivities": string[] | null,
              "resources": [
                {
                  "type": string,
                  "title": string,
                  "url": string | null,
                  "description": string | null
                }
              ] | null
            }
          ]
        }
      ],
      "milestones": [
        {
          "title": string,
          "successCriteria": string
        }
      ] | null
    }

    Ensure all strings use double quotes and the JSON is strictly valid.`
  }

  private parseModelOutput(payload: string): unknown {
    const trimmed = payload.trim()

    const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/i)
    const jsonString = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmed

    try {
      return JSON.parse(jsonString)
    } catch (error) {
      this.logger.error(
        'Failed to parse JSON from model output',
        error instanceof Error ? error.stack : undefined
      )
      throw new InternalServerErrorException(
        'The language model returned an unexpected response format.'
      )
    }
  }

  private formatEnumValue(value: ExperienceLevel | LearningPace): string {
    return value.replace(/-/g, ' ')
  }

  private sanitizeModelText(payload: string): string {
    const trimmed = payload.trim()
    const fencedMatch = trimmed.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/)

    if (fencedMatch) {
      return fencedMatch[1].trim()
    }

    return trimmed
  }

  private buildInsightPrompt(
    roadmap: Roadmap,
    dto: RoadmapInsightRequestDto
  ): string {
    const roadmapSnapshot = {
      topic: roadmap.topic,
      experienceLevel: roadmap.experienceLevel ?? null,
      learningPace: roadmap.learningPace ?? null,
      timeframe: roadmap.timeframe ?? null,
      summary: roadmap.summary,
      phases: roadmap.phases,
      milestones: roadmap.milestones ?? null,
      requestContext: roadmap.requestContext ?? null
    }

    const focusHints = [
      dto.phaseTitle ? `Phase focus: ${dto.phaseTitle}` : null,
      dto.stepTitle ? `Step focus: ${dto.stepTitle}` : null
    ].filter((value): value is string => Boolean(value))

    const focusBlock =
      focusHints.length > 0
        ? `\nFocus hints:\n${focusHints
            .map((line) => `- ${line}`)
            .join('\n')}\n`
        : ''

    return `Provide a clear, encouraging, and actionable explanation that helps the learner act on their roadmap. Reference specific roadmap details when relevant and avoid inventing new milestones or steps. If the roadmap does not contain enough information to answer, say so and recommend what the learner could clarify.\n\nRoadmap context (JSON):\n${JSON.stringify(
      roadmapSnapshot,
      null,
      2
    )}\n${focusBlock}\nLearner question:\n${dto.question}`
  }
}
