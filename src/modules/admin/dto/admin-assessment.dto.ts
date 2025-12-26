import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'

import {
  AssessmentDifficulty,
  AssessmentStatus
} from '../../assessments/entities/assessment.entity'
import { PaginationQueryDto } from './pagination.dto'

export class AdminAssessmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string

  @ApiPropertyOptional({ description: 'Search by domain' })
  @IsOptional()
  @IsString()
  domain?: string

  @ApiPropertyOptional({ enum: AssessmentStatus })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus

  @ApiPropertyOptional({ enum: AssessmentDifficulty })
  @IsOptional()
  @IsEnum(AssessmentDifficulty)
  difficulty?: AssessmentDifficulty
}

export class AssessmentOwnerDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  email: string

  @ApiProperty()
  @Expose()
  firstName: string

  @ApiProperty()
  @Expose()
  lastName: string

  @ApiPropertyOptional({ description: 'User avatar URL' })
  @Expose()
  avatar?: string
}

export class AdminAssessmentResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  domain: string

  @ApiProperty({ enum: AssessmentDifficulty })
  @Expose()
  difficulty: AssessmentDifficulty

  @ApiProperty()
  @Expose()
  questionCount: number

  @ApiProperty({ enum: AssessmentStatus })
  @Expose()
  status: AssessmentStatus

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date

  @ApiProperty({ type: AssessmentOwnerDto })
  @Expose()
  @Type(() => AssessmentOwnerDto)
  owner: AssessmentOwnerDto
}

export class AdminAssessmentDetailResponseDto extends AdminAssessmentResponseDto {
  @ApiProperty()
  @Expose()
  answeredCount: number

  @ApiPropertyOptional()
  @Expose()
  result?: {
    score: number
    totalQuestions: number
    correctAnswers: number
    completedAt: Date
  }
}
