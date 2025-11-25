import { GoogleGenAI, type GenerationConfig } from '@google/genai'
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import {
  AssessmentResultResponseDto,
  QuestionBreakdownDto
} from './dto/assessment-result-response.dto'
import { AssessmentQuestion } from './entities/assessment-question.entity'
import { AssessmentResponse } from './entities/assessment-response.entity'
import {
  AssessmentResult,
  PerformanceSummary,
  SuggestedRoadmap
} from './entities/assessment-result.entity'
import { AssessmentShare } from './entities/assessment-share.entity'
import { Assessment, AssessmentStatus } from './entities/assessment.entity'

type GenerationSettings = Pick<
  GenerationConfig,
  'temperature' | 'topP' | 'topK' | 'maxOutputTokens'
>

const RESULTS_SYSTEM_PROMPT = `You are an expert educational mentor analyzing assessment performance. Provide constructive, encouraging, and actionable feedback that helps learners understand their strengths and areas for improvement.

Rules:
- Always respond with valid JSON that matches the provided schema.
- Be specific about what the learner did well and where they need work.
- Provide concrete study recommendations tailored to the weak areas.
- Be encouraging but honest about performance.
- Focus on educational growth and learning strategies.`

const ROADMAP_SUGGESTION_PROMPT = `You are an expert educational advisor. Based on assessment results, suggest relevant learning roadmap topics that would help the learner improve in their weak areas.

Rules:
- Always respond with valid JSON that matches the provided schema.
- Suggest 6-8 specific, actionable roadmap topics.
- Focus on the weakest areas that need the most improvement.`

@Injectable()
export class AssessmentResultsService {
  private readonly logger = new Logger(AssessmentResultsService.name)
  private readonly client: GoogleGenAI
  private readonly modelName: string
  private readonly generationDefaults: GenerationSettings

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Assessment)
    private readonly assessmentsRepository: Repository<Assessment>,
    @InjectRepository(AssessmentQuestion)
    private readonly questionsRepository: Repository<AssessmentQuestion>,
    @InjectRepository(AssessmentResponse)
    private readonly responsesRepository: Repository<AssessmentResponse>,
    @InjectRepository(AssessmentResult)
    private readonly resultsRepository: Repository<AssessmentResult>,
    @InjectRepository(AssessmentShare)
    private readonly sharesRepository: Repository<AssessmentShare>
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

  async completeAssessment(
    userId: string,
    assessmentId: string
  ): Promise<AssessmentResultResponseDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId }
    })

    if (!assessment) {
      throw new NotFoundException('Assessment not found')
    }

    const isOwner = assessment.userId === userId

    if (!isOwner) {
      if (!assessment.isSharedWithAll) {
        const hasAccess = await this.sharesRepository.exist({
          where: {
            assessmentId,
            sharedWithUserId: userId
          }
        })

        if (!hasAccess) {
          throw new NotFoundException('Assessment not found')
        }
      }
    }

    if (assessment.status === AssessmentStatus.COMPLETED) {
      return await this.getResults(userId, assessmentId)
    }

    // Check if all questions have been answered
    const answeredCount = await this.responsesRepository.count({
      where: { assessmentId }
    })

    if (answeredCount < assessment.questionCount) {
      throw new BadRequestException(
        `Only ${answeredCount} of ${assessment.questionCount} questions have been answered. Please answer all questions before completing the assessment.`
      )
    }

    // Calculate results
    const responses = await this.responsesRepository.find({
      where: { assessmentId },
      relations: ['question']
    })

    const correctCount = responses.filter((r) => r.isCorrect).length
    const totalQuestions = assessment.questionCount
    const score = (correctCount / totalQuestions) * 100

    // Generate AI summary
    const summary = await this.generatePerformanceSummary(
      assessment,
      responses,
      score
    )

    // Generate roadmap suggestions
    const suggestedRoadmaps = await this.generateRoadmapSuggestions(
      assessment,
      responses,
      score
    )

    // Save results
    const result = this.resultsRepository.create({
      assessmentId,
      score,
      correctCount,
      totalQuestions,
      summary,
      suggestedRoadmaps
    })

    const savedResult = await this.resultsRepository.save(result)

    // Update assessment status
    assessment.status = AssessmentStatus.COMPLETED
    await this.assessmentsRepository.save(assessment)

    return this.toResultResponse(savedResult, assessment, responses)
  }

  async getResults(
    userId: string,
    assessmentId: string
  ): Promise<AssessmentResultResponseDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId }
    })

    if (!assessment) {
      throw new NotFoundException('Assessment not found')
    }

    const isOwner = assessment.userId === userId

    if (!isOwner) {
      if (!assessment.isSharedWithAll) {
        const hasAccess = await this.sharesRepository.exist({
          where: {
            assessmentId,
            sharedWithUserId: userId
          }
        })

        if (!hasAccess) {
          throw new NotFoundException('Assessment not found')
        }
      }
    }

    if (assessment.status !== AssessmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Assessment has not been completed yet. Please complete all questions first.'
      )
    }

    const result = await this.resultsRepository.findOne({
      where: { assessmentId }
    })

    if (!result) {
      throw new NotFoundException('Assessment results not found')
    }

    const responses = await this.responsesRepository.find({
      where: { assessmentId },
      relations: ['question']
    })

    return this.toResultResponse(result, assessment, responses)
  }

  private async generatePerformanceSummary(
    assessment: Assessment,
    responses: AssessmentResponse[],
    score: number
  ): Promise<PerformanceSummary> {
    const incorrectQuestions = responses
      .filter((r) => !r.isCorrect)
      .map((r) => r.question.questionText)

    const prompt = `Analyze this assessment performance and provide constructive feedback.

Assessment Domain: ${assessment.domain}
Difficulty Level: ${assessment.difficulty}
Score: ${score.toFixed(1)}%
Correct Answers: ${responses.filter((r) => r.isCorrect).length} out of ${responses.length}

Incorrect Questions:
${incorrectQuestions.length > 0 ? incorrectQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'None - perfect score!'}

Provide:
1. Overall performance assessment (2-3 sentences)
2. Specific strengths demonstrated (array of 2-4 items)
3. Areas needing improvement (array of 2-4 items, or empty if perfect score)
4. Specific topics to review (array of 3-5 topics based on incorrect answers, or general topics for perfect scores)
5. Study recommendations (array of 3-5 actionable study strategies)

Output JSON schema:
{
  "overallAssessment": string,
  "strengths": string[],
  "weaknesses": string[],
  "topicsToReview": string[],
  "studyRecommendations": string[]
}

Ensure all strings use double quotes and the JSON is strictly valid.`

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          ...this.generationDefaults,
          responseMimeType: 'application/json',
          systemInstruction: RESULTS_SYSTEM_PROMPT
        }
      })

      const textResponse = response.text?.trim()

      if (!textResponse) {
        throw new InternalServerErrorException(
          'The language model returned an empty response.'
        )
      }

      const parsed = this.parseModelOutput(textResponse)
      return this.validatePerformanceSummary(parsed)
    } catch (error) {
      this.logger.error(
        'Failed to generate performance summary',
        error instanceof Error ? error.stack : undefined
      )

      // Fallback to basic summary
      return this.generateBasicSummary(assessment, score)
    }
  }

  private async generateRoadmapSuggestions(
    assessment: Assessment,
    responses: AssessmentResponse[],
    score: number
  ): Promise<SuggestedRoadmap[] | null> {
    // Only suggest roadmaps if score is below 90%
    if (score >= 90) {
      return null
    }

    const incorrectQuestions = responses
      .filter((r) => !r.isCorrect)
      .map((r) => r.question.questionText)

    const weakTopics = incorrectQuestions.slice(0, 5).join(', ')

    const prompt = `Based on this assessment performance, suggest 6-8 learning roadmap topics that would help improve in the identified weak areas.

Assessment Domain: ${assessment.domain}
Score: ${score.toFixed(1)}%
Weak Areas: ${weakTopics}

For each suggested roadmap topic:
- Provide a clear, specific topic title

Output JSON schema:
{
  "roadmaps": [
    {
      "topic": string
    }
  ]
}

Ensure all strings use double quotes and the JSON is strictly valid.`

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          ...this.generationDefaults,
          responseMimeType: 'application/json',
          systemInstruction: ROADMAP_SUGGESTION_PROMPT
        }
      })

      const textResponse = response.text?.trim()

      if (!textResponse) {
        return null
      }

      const parsed = this.parseModelOutput(textResponse)

      if (
        parsed &&
        typeof parsed === 'object' &&
        'roadmaps' in parsed &&
        Array.isArray(parsed.roadmaps)
      ) {
        return parsed.roadmaps.slice(0, 8) as SuggestedRoadmap[]
      }

      return null
    } catch (error) {
      this.logger.error(
        'Failed to generate roadmap suggestions',
        error instanceof Error ? error.stack : undefined
      )

      return null
    }
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

  private validatePerformanceSummary(payload: unknown): PerformanceSummary {
    if (!payload || typeof payload !== 'object') {
      throw new InternalServerErrorException('Invalid summary structure')
    }

    const summary = payload as Record<string, unknown>

    if (
      typeof summary.overallAssessment !== 'string' ||
      !Array.isArray(summary.strengths) ||
      !Array.isArray(summary.weaknesses) ||
      !Array.isArray(summary.topicsToReview) ||
      !Array.isArray(summary.studyRecommendations)
    ) {
      throw new InternalServerErrorException('Invalid summary structure')
    }

    return {
      overallAssessment: summary.overallAssessment,
      strengths: summary.strengths as string[],
      weaknesses: summary.weaknesses as string[],
      topicsToReview: summary.topicsToReview as string[],
      studyRecommendations: summary.studyRecommendations as string[]
    }
  }

  private generateBasicSummary(
    assessment: Assessment,
    score: number
  ): PerformanceSummary {
    let overallAssessment = ''
    let strengths: string[] = []
    let weaknesses: string[] = []

    if (score >= 90) {
      overallAssessment = `Excellent performance! You demonstrated strong mastery of ${assessment.domain}.`
      strengths = [
        'Strong foundational knowledge',
        'Ability to apply concepts correctly'
      ]
      weaknesses = []
    } else if (score >= 70) {
      overallAssessment = `Good performance overall. You have a solid understanding of ${assessment.domain} with some areas for improvement.`
      strengths = ['Good grasp of core concepts']
      weaknesses = ['Some gaps in understanding specific topics']
    } else if (score >= 50) {
      overallAssessment = `Fair performance. You have basic understanding of ${assessment.domain} but need more practice and study.`
      strengths = ['Basic familiarity with the domain']
      weaknesses = [
        'Significant gaps in knowledge',
        'Need more practice with core concepts'
      ]
    } else {
      overallAssessment = `This assessment shows you need substantial study in ${assessment.domain}. Focus on building foundational knowledge.`
      strengths = ['Identified areas needing improvement']
      weaknesses = [
        'Major gaps in foundational knowledge',
        'Need comprehensive review of the domain'
      ]
    }

    return {
      overallAssessment,
      strengths,
      weaknesses,
      topicsToReview: [
        `Review fundamental concepts in ${assessment.domain}`,
        'Practice with similar questions',
        'Study incorrect answers and explanations'
      ],
      studyRecommendations: [
        'Review the explanations for incorrect answers',
        'Use the provided learning resources',
        'Take another practice assessment after studying',
        'Focus on weak areas identified in the results'
      ]
    }
  }

  private toResultResponse(
    result: AssessmentResult,
    assessment: Assessment,
    responses: AssessmentResponse[]
  ): AssessmentResultResponseDto {
    const questionBreakdown = responses.map((response) =>
      plainToInstance(
        QuestionBreakdownDto,
        {
          questionId: response.question.id,
          questionText: response.question.questionText,
          options: response.question.options,
          correctAnswerIndex: response.question.correctAnswerIndex,
          selectedAnswerIndex: response.selectedAnswerIndex,
          isCorrect: response.isCorrect,
          explanation: response.question.explanation,
          resources: response.question.resources ?? undefined,
          timeSpent: response.timeSpent ?? undefined
        },
        { excludeExtraneousValues: true }
      )
    )

    return plainToInstance(
      AssessmentResultResponseDto,
      {
        id: result.id,
        assessmentId: result.assessmentId,
        domain: assessment.domain,
        score: parseFloat(result.score.toString()),
        correctCount: result.correctCount,
        totalQuestions: result.totalQuestions,
        summary: result.summary,
        questionBreakdown,
        suggestedRoadmaps: result.suggestedRoadmaps ?? undefined,
        completedAt: result.completedAt.toISOString()
      },
      { excludeExtraneousValues: true }
    )
  }
}
