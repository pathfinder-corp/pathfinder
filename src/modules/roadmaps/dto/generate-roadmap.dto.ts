import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from 'class-validator'

const trimValue = ({ value }: { value: string }) =>
  typeof value === 'string' ? value.trim() : value

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum LearningPace {
  FLEXIBLE = 'flexible',
  BALANCED = 'balanced',
  INTENSIVE = 'intensive'
}

export class GenerateRoadmapDto {
  @ApiProperty({
    description:
      'Primary topic the user wants to explore, such as a skill, role, or course',
    example: 'Full-stack web developer'
  })
  @IsString()
  @IsNotEmpty()
  @Transform(trimValue)
  @MaxLength(150)
  topic!: string

  @ApiPropertyOptional({
    description:
      'Context about current skills, education, or relevant experience',
    example: 'Computer science graduate with basic JavaScript knowledge'
  })
  @IsOptional()
  @IsString()
  @Transform(trimValue)
  @MaxLength(500)
  background?: string

  @ApiPropertyOptional({
    description: 'Desired outcome or target role to reach through the roadmap',
    example: 'Become a front-end engineer within a tech startup'
  })
  @IsOptional()
  @IsString()
  @Transform(trimValue)
  @MaxLength(250)
  targetOutcome?: string

  @ApiPropertyOptional({
    description: 'Self-assessed proficiency level related to the topic',
    enum: ExperienceLevel,
    example: ExperienceLevel.BEGINNER
  })
  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel

  @ApiPropertyOptional({
    description: 'Preferred pace to complete the roadmap',
    enum: LearningPace,
    example: LearningPace.BALANCED
  })
  @IsOptional()
  @IsEnum(LearningPace)
  learningPace?: LearningPace

  @ApiPropertyOptional({
    description:
      'Total timeframe or deadline the user has in mind for completing the roadmap',
    example: '6 months'
  })
  @IsOptional()
  @IsString()
  @Transform(trimValue)
  @MaxLength(100)
  timeframe?: string

  @ApiPropertyOptional({
    description:
      'Any additional preferences, constraints, or learning preferences to respect',
    example: 'Prefer project-based learning with open educational resources'
  })
  @IsOptional()
  @IsString()
  @Transform(trimValue)
  @MaxLength(500)
  preferences?: string
}
