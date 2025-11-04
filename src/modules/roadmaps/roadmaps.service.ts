import { GoogleGenAI, type GenerationConfig } from '@google/genai'
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { instanceToPlain, plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { User } from '../users/entities/user.entity'
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
  RoadmapContentDto,
  RoadmapResponseDto
} from './dto/roadmap-response.dto'
import {
  Roadmap,
  RoadmapRequestContext,
  RoadmapSummary
} from './entities/roadmap.entity'
import { RoadmapContentPolicyService } from './roadmap-content-policy.service'

type GenerationSettings = Pick<
  GenerationConfig,
  'temperature' | 'topP' | 'topK' | 'maxOutputTokens'
>

type RoadmapContentPlain = {
  topic: string
  experienceLevel?: ExperienceLevel | null
  learningPace?: LearningPace | null
  timeframe?: string | null
  summary: RoadmapSummary
  phases: Roadmap['phases']
  milestones?: Roadmap['milestones']
}

const SYSTEM_PROMPT = `You are an expert academic and career advisor. Build concise yet actionable roadmaps that combine skill acquisition, experiential learning, and milestone tracking.

Rules:
- Always respond with valid JSON that matches the provided schema.
- Provide realistic time estimates and hands-on activities.
- Reference reputable, preferably free or low-cost resources when possible.
- Align steps to progressively develop mastery toward the stated goal.
- Highlight checkpoints that confirm the learner is ready to advance.
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
  private readonly client: GoogleGenAI
  private readonly modelName: string
  private readonly generationDefaults: GenerationSettings

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Roadmap)
    private readonly roadmapsRepository: Repository<Roadmap>,
    private readonly contentPolicy: RoadmapContentPolicyService
  ) {
    const apiKey = this.configService.get<string>('genai.apiKey')

    if (!apiKey) {
      throw new Error('GENAI_API_KEY is not configured.')
    }

    this.client = new GoogleGenAI({ apiKey })
    this.modelName =
      this.configService.get<string>('genai.model') ?? 'gemini-2.5-flash'

    this.generationDefaults = {
      temperature: this.configService.get<number>('genai.temperature') ?? 0.4,
      topP: this.configService.get<number>('genai.topP') ?? 0.95,
      topK: this.configService.get<number>('genai.topK') ?? 32,
      maxOutputTokens:
        this.configService.get<number>('genai.maxOutputTokens') ?? 32768
    }
  }

  async generateRoadmap(
    user: User,
    generateRoadmapDto: GenerateRoadmapDto
  ): Promise<RoadmapResponseDto> {
    this.contentPolicy.validateRoadmapRequest(generateRoadmapDto)

    const prompt = this.buildPrompt(generateRoadmapDto)

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          ...this.generationDefaults,
          responseMimeType: 'application/json',
          systemInstruction: SYSTEM_PROMPT
        }
      })

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

      console.log(roadmapPlain)

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
          requestContext: this.buildRequestContext(generateRoadmapDto)
        })
      )

      return this.toRoadmapResponse(savedRoadmap)
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
      order: { createdAt: 'DESC' }
    })

    return roadmaps.map((roadmap) => this.toRoadmapResponse(roadmap))
  }

  async getRoadmapById(
    userId: string,
    roadmapId: string
  ): Promise<RoadmapResponseDto> {
    const roadmap = await this.roadmapsRepository.findOne({
      where: { id: roadmapId, userId }
    })

    if (!roadmap) {
      throw new NotFoundException('Roadmap not found')
    }

    return this.toRoadmapResponse(roadmap)
  }

  async deleteRoadmap(userId: string, roadmapId: string): Promise<void> {
    const result = await this.roadmapsRepository.delete({ id: roadmapId, userId })

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
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          ...this.generationDefaults,
          responseMimeType: 'text/plain',
          systemInstruction: INSIGHT_SYSTEM_PROMPT
        }
      })

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

  private toRoadmapResponse(roadmap: Roadmap): RoadmapResponseDto {
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

Instructions:
- Break the roadmap into sequential phases. Each phase must include at least two detailed steps.
- Each step should outline concrete activities, suggested deliverables, and any notable resources.
- Provide a summary that includes recommended duration and success tips tailored to the user.
- Include milestone checkpoints that demonstrate capability progression.

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
      "outcome": string,
      "estimatedDuration": string | null,
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
