import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'

import {
  AssessmentDifficulty,
  AssessmentStatus
} from '../entities/assessment.entity'

@Exclude()
export class AssessmentAttemptSummaryDto {
  @Expose()
  @ApiProperty({ description: 'Assessment UUID' })
  id!: string

  @Expose()
  @ApiProperty({ description: 'Attempt number (1, 2, 3, etc.)' })
  attemptNumber!: number

  @Expose()
  @ApiProperty({ enum: AssessmentStatus })
  status!: AssessmentStatus

  @Expose()
  @ApiPropertyOptional({ description: 'Score percentage if completed' })
  score?: number | null

  @Expose()
  @ApiPropertyOptional({ description: 'Correct answers count if completed' })
  correctCount?: number | null

  @Expose()
  @ApiProperty({ description: 'Total number of questions' })
  totalQuestions!: number

  @Expose()
  @ApiProperty({ description: 'When this attempt was created' })
  createdAt!: string

  @Expose()
  @ApiPropertyOptional({ description: 'When this attempt was completed' })
  completedAt?: string | null
}

@Exclude()
export class AssessmentHistoryResponseDto {
  @Expose()
  @ApiProperty({ description: 'Original assessment UUID' })
  originalAssessmentId!: string

  @Expose()
  @ApiProperty({ description: 'Domain or topic being assessed' })
  domain!: string

  @Expose()
  @ApiProperty({ enum: AssessmentDifficulty })
  difficulty!: AssessmentDifficulty

  @Expose()
  @ApiProperty({ description: 'Total number of attempts' })
  totalAttempts!: number

  @Expose()
  @ApiProperty({
    description: 'All attempts for this assessment',
    type: [AssessmentAttemptSummaryDto]
  })
  attempts!: AssessmentAttemptSummaryDto[]

  @Expose()
  @ApiPropertyOptional({
    description: 'Best score achieved across all attempts'
  })
  bestScore?: number | null

  @Expose()
  @ApiPropertyOptional({
    description: 'Latest score achieved'
  })
  latestScore?: number | null

  @Expose()
  @ApiProperty({ description: 'When the first attempt was created' })
  firstAttemptDate!: string

  @Expose()
  @ApiProperty({ description: 'When the latest attempt was created' })
  latestAttemptDate!: string
}
