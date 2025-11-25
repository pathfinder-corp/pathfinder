import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'

import {
  AssessmentDifficulty,
  AssessmentStatus
} from '../entities/assessment.entity'
import { QuestionResource } from '../entities/assessment-question.entity'

@Exclude()
export class AssessmentQuestionDto {
  @Expose()
  @ApiProperty({ description: 'Question UUID' })
  id!: string

  @Expose()
  @ApiProperty({ description: 'The question text' })
  questionText!: string

  @Expose()
  @ApiProperty({ description: 'Array of 4 answer options', type: [String] })
  options!: string[]

  @Expose()
  @ApiPropertyOptional({
    description: 'Learning resources related to this question',
    type: 'array',
    items: { type: 'object' }
  })
  resources?: QuestionResource[] | null

  @Expose()
  @ApiProperty({ description: 'Order index for this question' })
  orderIndex!: number
}

@Exclude()
export class AssessmentResponseDto {
  @Expose()
  @ApiProperty({ description: 'Assessment UUID' })
  id!: string

  @Expose()
  @ApiProperty({ description: 'Domain or topic being assessed' })
  domain!: string

  @Expose()
  @ApiProperty({ enum: AssessmentDifficulty })
  difficulty!: AssessmentDifficulty

  @Expose()
  @ApiProperty({ description: 'Total number of questions' })
  questionCount!: number

  @Expose()
  @ApiProperty({ enum: AssessmentStatus })
  status!: AssessmentStatus

  @Expose()
  @ApiProperty({ description: 'Whether assessment is shared publicly' })
  isSharedWithAll!: boolean

  @Expose()
  @ApiProperty({ description: 'Number of questions answered so far' })
  answeredCount!: number

  @Expose()
  @Type(() => AssessmentQuestionDto)
  @ApiProperty({
    description: 'Array of questions (without correct answers or explanations)',
    type: [AssessmentQuestionDto]
  })
  questions!: AssessmentQuestionDto[]

  @Expose()
  @ApiProperty({ description: 'Assessment creation timestamp' })
  createdAt!: string

  @Expose()
  @ApiProperty({ description: 'Assessment last update timestamp' })
  updatedAt!: string
}


