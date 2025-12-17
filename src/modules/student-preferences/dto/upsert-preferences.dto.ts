import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator'

export class UpsertPreferencesDto {
  @ApiPropertyOptional({
    description: 'Domains of interest for mentorship',
    type: [String],
    example: ['Software Engineering', 'Machine Learning']
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  domains?: string[]

  @ApiPropertyOptional({
    description: 'Career/learning goals',
    type: [String],
    example: ['Get promoted to senior', 'Learn system design']
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  goals?: string[]

  @ApiPropertyOptional({
    description: 'Skills looking to develop',
    type: [String],
    example: ['Leadership', 'TypeScript', 'Cloud Architecture']
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  skills?: string[]

  @ApiPropertyOptional({
    description: 'Preferred language for communication',
    example: 'English'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string

  @ApiPropertyOptional({
    description: 'Languages the student can communicate in',
    type: [String],
    example: ['English', 'Spanish']
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  languages?: string[]

  @ApiPropertyOptional({
    description: 'Minimum years of experience preferred in a mentor',
    minimum: 0,
    maximum: 50
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  minYearsExperience?: number

  @ApiPropertyOptional({
    description: 'Industries of interest',
    type: [String],
    example: ['FinTech', 'Healthcare']
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  industries?: string[]

  @ApiPropertyOptional({
    description: 'Additional notes or requirements',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalNotes?: string
}
