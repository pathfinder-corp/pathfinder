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

import { User } from '../users/entities/user.entity'
import { AssessmentContentPolicyService } from './assessment-content-policy.service'
import {
  AssessmentQuestionDto,
  AssessmentResponseDto
} from './dto/assessment-response.dto'
import { CreateAssessmentDto } from './dto/create-assessment.dto'
import { SubmitAnswerDto } from './dto/submit-answer.dto'
import {
  AssessmentQuestion,
  QuestionResource
} from './entities/assessment-question.entity'
import { AssessmentResponse } from './entities/assessment-response.entity'
import {
  Assessment,
  AssessmentDifficulty,
  AssessmentStatus
} from './entities/assessment.entity'

type GenerationSettings = Pick<
  GenerationConfig,
  'temperature' | 'topP' | 'topK' | 'maxOutputTokens'
>

type GeneratedQuestion = {
  questionText: string
  options: string[]
  correctAnswerIndex: number
  explanation: string
  resources?: QuestionResource[] | null
}

type GeneratedAssessment = {
  domain: string
  difficulty: AssessmentDifficulty
  questions: GeneratedQuestion[]
}

const SYSTEM_PROMPT = `You are an expert educational assessment creator. Generate high-quality, accurate, and fair multiple-choice questions that assess knowledge in the specified domain.

Rules:
- Always respond with valid JSON that matches the provided schema.
- Each question must have exactly 4 answer options.
- Only one option should be correct.
- Questions should be clear, unambiguous, and fair.
- Explanations should be detailed and educational.
- Include 1-2 relevant learning resources per question when possible.
- Distribute questions across different aspects of the domain.
- Adjust difficulty appropriately: easy (fundamental concepts), medium (practical application), hard (advanced theory and edge cases).
- Decline any request that is not focused on educational assessment or that touches sensitive or harmful topics (violence, weapons, self-harm, adult content, hate, or illegal activities). Respond with: "I'm sorry, but I can only help with educational assessments."
- Never produce content that facilitates dangerous, hateful, or illegal activities.`

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name)
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
    private readonly contentPolicy: AssessmentContentPolicyService
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

  async generateAssessment(
    user: User,
    createDto: CreateAssessmentDto
  ): Promise<AssessmentResponseDto> {
    this.contentPolicy.validateAssessmentRequest(createDto)

    const difficulty = createDto.difficulty ?? AssessmentDifficulty.MEDIUM
    const questionCount = createDto.questionCount ?? 15

    const prompt = this.buildPrompt(createDto.domain, difficulty, questionCount)

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
      const generatedAssessment = this.validateGeneratedAssessment(
        parsedPayload,
        createDto.domain,
        difficulty,
        questionCount
      )

      this.contentPolicy.validateGeneratedQuestions(
        generatedAssessment.questions
      )

      // Randomize question and option order
      const shuffledQuestions = this.shuffleQuestions(
        generatedAssessment.questions
      )

      // Create assessment with questions
      const assessment = this.assessmentsRepository.create({
        userId: user.id,
        domain: createDto.domain,
        difficulty,
        questionCount,
        status: AssessmentStatus.PENDING
      })

      const savedAssessment = await this.assessmentsRepository.save(assessment)

      const questions = shuffledQuestions.map((q, index) =>
        this.questionsRepository.create({
          assessmentId: savedAssessment.id,
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation,
          orderIndex: index,
          resources: q.resources ?? null
        })
      )

      const savedQuestions = await this.questionsRepository.save(questions)

      return this.toAssessmentResponse(savedAssessment, savedQuestions, 0)
    } catch (error) {
      this.logger.error(
        'Failed to generate assessment',
        error instanceof Error ? error.stack : undefined
      )

      if (
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException
      ) {
        throw error
      }

      throw new InternalServerErrorException(
        'Unable to generate an assessment at this time. Please try again later.'
      )
    }
  }

  async getAssessment(
    userId: string,
    assessmentId: string
  ): Promise<AssessmentResponseDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId },
      relations: ['questions']
    })

    if (!assessment) {
      throw new NotFoundException('Assessment not found')
    }

    const isOwner = assessment.userId === userId

    if (!isOwner) {
      throw new NotFoundException('Assessment not found')
    }

    const answeredCount = await this.responsesRepository.count({
      where: { assessmentId }
    })

    return this.toAssessmentResponse(
      assessment,
      assessment.questions || [],
      answeredCount
    )
  }

  async getUserAssessments(userId: string): Promise<AssessmentResponseDto[]> {
    const assessments = await this.assessmentsRepository.find({
      where: { userId },
      relations: ['questions'],
      order: { createdAt: 'DESC' }
    })

    const assessmentIds = assessments.map((a) => a.id)
    const responseCounts = new Map<string, number>()

    if (assessmentIds.length > 0) {
      const responses = await this.responsesRepository
        .createQueryBuilder('response')
        .select('response.assessment_id', 'assessmentId')
        .addSelect('COUNT(*)::int', 'count')
        .where('response.assessment_id IN (:...ids)', { ids: assessmentIds })
        .groupBy('response.assessment_id')
        .getRawMany()

      responses.forEach((r: { assessmentId: string; count: number }) => {
        responseCounts.set(r.assessmentId, r.count)
      })
    }

    return assessments.map((assessment) =>
      this.toAssessmentResponse(
        assessment,
        assessment.questions || [],
        responseCounts.get(assessment.id) || 0
      )
    )
  }

  async startAssessment(
    userId: string,
    assessmentId: string
  ): Promise<AssessmentResponseDto> {
    const assessment = await this.assessmentsRepository.findOne({
      where: { id: assessmentId },
      relations: ['questions']
    })

    if (!assessment) {
      throw new NotFoundException('Assessment not found')
    }

    const isOwner = assessment.userId === userId

    if (!isOwner) {
      throw new NotFoundException('Assessment not found')
    }

    if (assessment.status === AssessmentStatus.COMPLETED) {
      throw new BadRequestException('Assessment has already been completed')
    }

    assessment.status = AssessmentStatus.IN_PROGRESS
    await this.assessmentsRepository.save(assessment)

    const answeredCount = await this.responsesRepository.count({
      where: { assessmentId }
    })

    return this.toAssessmentResponse(
      assessment,
      assessment.questions || [],
      answeredCount
    )
  }

  async submitAnswer(
    userId: string,
    assessmentId: string,
    submitDto: SubmitAnswerDto
  ): Promise<{ isCorrect: boolean; correctAnswerIndex: number }> {
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
      throw new BadRequestException('Assessment has already been completed')
    }

    const question = await this.questionsRepository.findOne({
      where: { id: submitDto.questionId, assessmentId }
    })

    if (!question) {
      throw new NotFoundException('Question not found for this assessment')
    }

    // Check if already answered
    const existingResponse = await this.responsesRepository.findOne({
      where: { assessmentId, questionId: submitDto.questionId }
    })

    if (existingResponse) {
      throw new BadRequestException('This question has already been answered')
    }

    const isCorrect =
      submitDto.selectedAnswerIndex === question.correctAnswerIndex

    const response = this.responsesRepository.create({
      assessmentId,
      questionId: submitDto.questionId,
      selectedAnswerIndex: submitDto.selectedAnswerIndex,
      isCorrect,
      timeSpent: submitDto.timeSpent ?? null
    })

    await this.responsesRepository.save(response)

    return { isCorrect, correctAnswerIndex: question.correctAnswerIndex }
  }

  async deleteAssessment(userId: string, assessmentId: string): Promise<void> {
    const result = await this.assessmentsRepository.delete({
      id: assessmentId,
      userId
    })

    if (!result.affected) {
      throw new NotFoundException('Assessment not found')
    }
  }

  private buildPrompt(
    domain: string,
    difficulty: AssessmentDifficulty,
    questionCount: number
  ): string {
    const difficultyDescriptions: Record<AssessmentDifficulty, string> = {
      [AssessmentDifficulty.EASY]:
        'Focus on fundamental concepts, basic definitions, and simple recall. Questions should be straightforward and test foundational knowledge.',
      [AssessmentDifficulty.MEDIUM]:
        'Focus on practical application, understanding of key concepts, and ability to apply knowledge to common scenarios. Mix conceptual and application-based questions.',
      [AssessmentDifficulty.HARD]:
        'Focus on advanced theory, complex problem-solving, edge cases, and deep understanding. Include questions that require critical thinking and synthesis of multiple concepts.'
    }

    return `Create ${questionCount} multiple-choice questions to assess knowledge in: ${domain}

Difficulty level: ${difficulty}
${difficultyDescriptions[difficulty]}

Requirements:
- Each question must have exactly 4 answer options
- Only one option should be correct
- Options should be plain text WITHOUT any prefixes (no "A. ", "B. ", "1. ", "2. ", etc.)
- Include a detailed explanation for why the correct answer is right
- Suggest 1-2 relevant learning resources per question (with URLs when possible)
- Distribute questions across different aspects and subtopics within the domain
- Make distractors (incorrect options) plausible but clearly wrong
- Ensure questions are clear, unambiguous, and fair

Output JSON schema:
{
  "domain": string,
  "difficulty": "easy" | "medium" | "hard",
  "questions": [
    {
      "questionText": string,
      "options": [string, string, string, string],
      "correctAnswerIndex": number (0-3),
      "explanation": string,
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

  private validateGeneratedAssessment(
    payload: unknown,
    expectedDomain: string,
    expectedDifficulty: AssessmentDifficulty,
    expectedQuestionCount: number
  ): GeneratedAssessment {
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('questions' in payload) ||
      !Array.isArray(payload.questions)
    ) {
      throw new InternalServerErrorException(
        'Invalid assessment structure from model'
      )
    }

    const questions = payload.questions as GeneratedQuestion[]

    if (questions.length < expectedQuestionCount * 0.8) {
      throw new InternalServerErrorException(
        'Model generated insufficient questions'
      )
    }

    // Validate each question
    for (const question of questions) {
      if (
        !question.questionText ||
        !Array.isArray(question.options) ||
        question.options.length !== 4 ||
        typeof question.correctAnswerIndex !== 'number' ||
        question.correctAnswerIndex < 0 ||
        question.correctAnswerIndex > 3 ||
        !question.explanation
      ) {
        throw new InternalServerErrorException(
          'Invalid question format from model'
        )
      }
    }

    // Clean and return questions
    const cleanedQuestions = questions
      .slice(0, expectedQuestionCount)
      .map((q) => ({
        ...q,
        options: q.options.map((opt) => this.cleanOptionText(opt))
      }))

    return {
      domain: expectedDomain,
      difficulty: expectedDifficulty,
      questions: cleanedQuestions
    }
  }

  private cleanOptionText(option: string): string {
    // Remove common prefixes like "A. ", "B. ", "1. ", "2. ", etc.
    return option
      .trim()
      .replace(/^[A-Z]\.\s*/i, '') // Remove "A. ", "B. ", etc.
      .replace(/^[A-Z]\)\s*/i, '') // Remove "A) ", "B) ", etc.
      .replace(/^\d+\.\s*/, '') // Remove "1. ", "2. ", etc.
      .replace(/^\d+\)\s*/, '') // Remove "1) ", "2) ", etc.
      .replace(/^[ivxlcdm]+\.\s*/i, '') // Remove roman numerals "i. ", "ii. ", etc.
      .replace(/^[•\-*]\s*/, '') // Remove bullet points
      .trim()
  }

  private shuffleQuestions(
    questions: GeneratedQuestion[]
  ): GeneratedQuestion[] {
    // Shuffle question order
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5)

    // Shuffle options within each question
    return shuffledQuestions.map((question) => {
      const correctAnswer = question.options[question.correctAnswerIndex]

      // Shuffle options
      const shuffledOptions = [...question.options].sort(
        () => Math.random() - 0.5
      )

      // Find new index of correct answer
      const newCorrectIndex = shuffledOptions.indexOf(correctAnswer)

      return {
        ...question,
        options: shuffledOptions,
        correctAnswerIndex: newCorrectIndex
      }
    })
  }

  private toAssessmentResponse(
    assessment: Assessment,
    questions: AssessmentQuestion[],
    answeredCount: number
  ): AssessmentResponseDto {
    const sortedQuestions = [...questions].sort(
      (a, b) => a.orderIndex - b.orderIndex
    )

    const questionDtos = sortedQuestions.map((q) =>
      plainToInstance(
        AssessmentQuestionDto,
        {
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          resources: q.resources ?? undefined,
          orderIndex: q.orderIndex
        },
        { excludeExtraneousValues: true }
      )
    )

    return plainToInstance(
      AssessmentResponseDto,
      {
        id: assessment.id,
        domain: assessment.domain,
        difficulty: assessment.difficulty,
        questionCount: assessment.questionCount,
        status: assessment.status,
        answeredCount,
        questions: questionDtos,
        createdAt: assessment.createdAt.toISOString(),
        updatedAt: assessment.updatedAt.toISOString()
      },
      { excludeExtraneousValues: true }
    )
  }
}
