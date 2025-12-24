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
import { Assessment, AssessmentStatus } from './entities/assessment.entity'

type GenerationSettings = Pick<
  GenerationConfig,
  'temperature' | 'topP' | 'topK' | 'maxOutputTokens'
>

const ASSESSMENT_FEEDBACK_SYSTEM_PROMPT = `You are an expert educational mentor analyzing assessment performance. Provide constructive, encouraging, and actionable feedback that helps learners understand their strengths and areas for improvement.

Rules:
- Always respond with valid JSON that matches the provided schema.
- Do not use Markdown formatting, code blocks, or any special formatting in your response.
- Return only pure JSON without any surrounding text or formatting markers.
- Be specific about what the learner did well and where they need work.
- Be encouraging but honest about performance.
- Focus on educational growth and learning strategies.
- For scores 90% or above, omit roadmap suggestions (set to null).
- Decline any request that is not focused on educational assessment or that touches sensitive or harmful topics (violence, weapons, self-harm, adult content, hate, or illegal activities). Respond with: "I'm sorry, but I can only help with educational assessments."
- Never produce content that facilitates dangerous, hateful, or illegal activities.`

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
    private readonly resultsRepository: Repository<AssessmentResult>
  ) {
    const apiKey = this.configService.get<string>('genai.apiKey')

    if (!apiKey) {
      throw new Error('GENAI_API_KEY is not configured.')
    }

    this.client = new GoogleGenAI({ apiKey })
    this.modelName =
      this.configService.get<string>('genai.model') ?? 'gemini-3-flash-preview'

    this.generationDefaults = {
      temperature: 0.5,
      topP: 0.9,
      topK: 64,
      maxOutputTokens:
        this.configService.get<number>('genai.maxOutputTokens') ?? 65536
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
      throw new NotFoundException('Assessment not found')
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

    // Generate AI feedback (summary + roadmap suggestions)
    const { summary, suggestedRoadmaps } =
      await this.generateAssessmentFeedback(assessment, responses, score)

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
      throw new NotFoundException('Assessment not found')
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

  private async generateAssessmentFeedback(
    assessment: Assessment,
    responses: AssessmentResponse[],
    score: number
  ): Promise<{
    summary: PerformanceSummary
    suggestedRoadmaps: SuggestedRoadmap[] | null
  }> {
    const incorrectQuestions = responses
      .filter((r) => !r.isCorrect)
      .map((r) => r.question.questionText)

    const includeRoadmaps = score < 90

    const prompt = `Analyze this assessment performance and provide constructive, encouraging, and actionable feedback.

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
5. Concrete study recommendations tailored to the weak areas (array of 3-5 actionable study strategies)
${includeRoadmaps ? `6. Suggested learning roadmap topics (array of 6-8 specific topics designed to strengthen the areas identified as weak based on the incorrect questions)` : '6. Suggested roadmaps (set to null since score is 90% or above)'}


Output JSON schema:
{
  "summary": {
    "overallAssessment": string,
    "strengths": string[],
    "weaknesses": string[],
    "topicsToReview": string[],
    "studyRecommendations": string[]
  },
  "suggestedRoadmaps": ${includeRoadmaps ? '[{ "topic": string }]' : 'null'}
}

Ensure all strings use double quotes and the JSON is strictly valid.`

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          ...this.generationDefaults,
          responseMimeType: 'application/json',
          systemInstruction: ASSESSMENT_FEEDBACK_SYSTEM_PROMPT
        }
      })

      const textResponse = response.text?.trim()

      if (!textResponse) {
        throw new InternalServerErrorException(
          'The language model returned an empty response.'
        )
      }

      const parsed = this.parseModelOutput(textResponse)
      return this.validateAssessmentFeedback(parsed)
    } catch (error) {
      this.logger.error(
        'Failed to generate assessment feedback',
        error instanceof Error ? error.stack : undefined
      )

      // Fallback to basic feedback
      return this.generateBasicFeedback(assessment, score)
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

  private validateAssessmentFeedback(payload: unknown): {
    summary: PerformanceSummary
    suggestedRoadmaps: SuggestedRoadmap[] | null
  } {
    if (!payload || typeof payload !== 'object') {
      throw new InternalServerErrorException('Invalid feedback structure')
    }

    const feedback = payload as Record<string, unknown>

    // Validate summary
    if (!feedback.summary || typeof feedback.summary !== 'object') {
      throw new InternalServerErrorException('Invalid summary structure')
    }

    const summary = feedback.summary as Record<string, unknown>

    if (
      typeof summary.overallAssessment !== 'string' ||
      !Array.isArray(summary.strengths) ||
      !Array.isArray(summary.weaknesses) ||
      !Array.isArray(summary.topicsToReview) ||
      !Array.isArray(summary.studyRecommendations)
    ) {
      throw new InternalServerErrorException('Invalid summary structure')
    }

    // Validate roadmaps (can be null or array)
    let suggestedRoadmaps: SuggestedRoadmap[] | null = null

    if (
      feedback.suggestedRoadmaps !== null &&
      feedback.suggestedRoadmaps !== undefined
    ) {
      if (!Array.isArray(feedback.suggestedRoadmaps)) {
        throw new InternalServerErrorException('Invalid roadmaps structure')
      }
      suggestedRoadmaps = (feedback.suggestedRoadmaps as Array<unknown>).slice(
        0,
        8
      ) as SuggestedRoadmap[]
    }

    return {
      summary: {
        overallAssessment: summary.overallAssessment,
        strengths: summary.strengths as string[],
        weaknesses: summary.weaknesses as string[],
        topicsToReview: summary.topicsToReview as string[],
        studyRecommendations: summary.studyRecommendations as string[]
      },
      suggestedRoadmaps
    }
  }

  private generateBasicFeedback(
    assessment: Assessment,
    score: number
  ): {
    summary: PerformanceSummary
    suggestedRoadmaps: SuggestedRoadmap[] | null
  } {
    let overallAssessment = ''
    let strengths: string[] = []
    let weaknesses: string[] = []
    let suggestedRoadmaps: SuggestedRoadmap[] | null = null

    if (score >= 90) {
      overallAssessment = `Excellent performance! You demonstrated strong mastery of ${assessment.domain}.`
      strengths = [
        'Strong foundational knowledge',
        'Ability to apply concepts correctly'
      ]
      weaknesses = []
      suggestedRoadmaps = null
    } else if (score >= 70) {
      overallAssessment = `Good performance overall. You have a solid understanding of ${assessment.domain} with some areas for improvement.`
      strengths = ['Good grasp of core concepts']
      weaknesses = ['Some gaps in understanding specific topics']
      suggestedRoadmaps = [
        { topic: `Advanced ${assessment.domain} concepts` },
        { topic: 'Practice exercises and problem-solving' },
        { topic: 'Real-world applications' },
        { topic: 'Common pitfalls and best practices' }
      ]
    } else if (score >= 50) {
      overallAssessment = `Fair performance. You have basic understanding of ${assessment.domain} but need more practice and study.`
      strengths = ['Basic familiarity with the domain']
      weaknesses = [
        'Significant gaps in knowledge',
        'Need more practice with core concepts'
      ]
      suggestedRoadmaps = [
        { topic: `${assessment.domain} fundamentals` },
        { topic: 'Core concepts and principles' },
        { topic: 'Guided tutorials and examples' },
        { topic: 'Practice problems with solutions' },
        { topic: 'Common patterns and techniques' }
      ]
    } else {
      overallAssessment = `This assessment shows you need substantial study in ${assessment.domain}. Focus on building foundational knowledge.`
      strengths = ['Identified areas needing improvement']
      weaknesses = [
        'Major gaps in foundational knowledge',
        'Need comprehensive review of the domain'
      ]
      suggestedRoadmaps = [
        { topic: `Introduction to ${assessment.domain}` },
        { topic: 'Basic terminology and concepts' },
        { topic: 'Beginner-friendly resources' },
        { topic: 'Step-by-step learning path' },
        { topic: 'Foundational principles' },
        { topic: 'Getting started guide' }
      ]
    }

    return {
      summary: {
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
      },
      suggestedRoadmaps
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
