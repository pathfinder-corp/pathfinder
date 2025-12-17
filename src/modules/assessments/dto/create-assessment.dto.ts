import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator'

import { AssessmentDifficulty } from '../entities/assessment.entity'

export class CreateAssessmentDto {
  @ApiProperty({
    description: 'The domain, topic, or skill to be assessed',
    example: 'JavaScript fundamentals'
  })
  @IsString()
  @IsNotEmpty()
  domain!: string

  @ApiPropertyOptional({
    description: 'Difficulty level of the assessment',
    enum: AssessmentDifficulty,
    default: AssessmentDifficulty.MEDIUM,
    example: AssessmentDifficulty.MEDIUM
  })
  @IsOptional()
  @IsEnum(AssessmentDifficulty)
  difficulty?: AssessmentDifficulty

  @ApiPropertyOptional({
    description: 'Number of questions to generate',
    minimum: 10,
    maximum: 20,
    default: 15,
    example: 15
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(20)
  questionCount?: number
}
