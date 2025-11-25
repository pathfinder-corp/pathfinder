import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'

import { QuestionResource } from '../entities/assessment-question.entity'
import * as assessmentResultEntity from '../entities/assessment-result.entity'

@Exclude()
export class QuestionBreakdownDto {
  @Expose()
  @ApiProperty({ description: 'Question UUID' })
  questionId!: string

  @Expose()
  @ApiProperty({ description: 'The question text' })
  questionText!: string

  @Expose()
  @ApiProperty({ description: 'Array of answer options', type: [String] })
  options!: string[]

  @Expose()
  @ApiProperty({ description: 'Index of the correct answer' })
  correctAnswerIndex!: number

  @Expose()
  @ApiProperty({ description: 'Index of the user selected answer' })
  selectedAnswerIndex!: number

  @Expose()
  @ApiProperty({ description: 'Whether the answer was correct' })
  isCorrect!: boolean

  @Expose()
  @ApiProperty({ description: 'Explanation for the correct answer' })
  explanation!: string

  @Expose()
  @ApiPropertyOptional({
    description: 'Learning resources related to this question',
    type: 'array',
    items: { type: 'object' }
  })
  resources?: QuestionResource[] | null

  @Expose()
  @ApiPropertyOptional({ description: 'Time spent on question in seconds' })
  timeSpent?: number | null
}

@Exclude()
export class AssessmentResultResponseDto {
  @Expose()
  @ApiProperty({ description: 'Result UUID' })
  id!: string

  @Expose()
  @ApiProperty({ description: 'Assessment UUID' })
  assessmentId!: string

  @Expose()
  @ApiProperty({ description: 'Domain or topic assessed' })
  domain!: string

  @Expose()
  @ApiProperty({ description: 'Score as percentage (0-100)' })
  score!: number

  @Expose()
  @ApiProperty({ description: 'Number of correct answers' })
  correctCount!: number

  @Expose()
  @ApiProperty({ description: 'Total number of questions' })
  totalQuestions!: number
  @Expose()
  @ApiProperty({
    description: 'AI-generated performance analysis',
    type: 'object',
    additionalProperties: true
  })
  summary!: assessmentResultEntity.PerformanceSummary

  @Expose()
  @Type(() => QuestionBreakdownDto)
  @ApiProperty({
    description: 'Detailed breakdown of each question and answer',
    type: [QuestionBreakdownDto]
  })
  questionBreakdown!: QuestionBreakdownDto[]

  @Expose()
  @ApiPropertyOptional({
    description: 'Suggested roadmap topics for improvement',
    type: 'array',
    items: { type: 'object' }
  })
  suggestedRoadmaps?: assessmentResultEntity.SuggestedRoadmap[] | null

  @Expose()
  @ApiProperty({ description: 'Completion timestamp' })
  completedAt!: string
}
