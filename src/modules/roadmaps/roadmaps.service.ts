import { GoogleGenAI, type GenerationConfig } from '@google/genai'
import {
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { plainToInstance } from 'class-transformer'

import {
  ExperienceLevel,
  GenerateRoadmapDto,
  LearningPace
} from './dto/generate-roadmap.dto'
import { RoadmapResponseDto } from './dto/roadmap-response.dto'

type GenerationSettings = Pick<
  GenerationConfig,
  'temperature' | 'topP' | 'topK' | 'maxOutputTokens'
>

const SYSTEM_PROMPT = `You are an expert academic and career advisor. Build concise yet actionable roadmaps that combine skill acquisition, experiential learning, and milestone tracking.

Rules:
- Always respond with valid JSON that matches the provided schema.
- Provide realistic time estimates and hands-on activities.
- Reference reputable, preferably free or low-cost resources when possible.
- Align steps to progressively develop mastery toward the stated goal.
- Highlight checkpoints that confirm the learner is ready to advance.`

@Injectable()
export class RoadmapsService {
  private readonly logger = new Logger(RoadmapsService.name)
  private readonly client: GoogleGenAI
  private readonly modelName: string
  private readonly generationDefaults: GenerationSettings

  constructor(private readonly configService: ConfigService) {
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
    generateRoadmapDto: GenerateRoadmapDto
  ): Promise<RoadmapResponseDto> {
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
      return plainToInstance(RoadmapResponseDto, parsedPayload, {
        enableImplicitConversion: true
      })
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
}
