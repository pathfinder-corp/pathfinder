import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator'
import { EducationLevel } from '../entities/academic-profile.entity'

export class CreateAcademicProfileDto {
  @ApiProperty({ enum: EducationLevel })
  @IsEnum(EducationLevel)
  currentLevel: EducationLevel

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currentGrade?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  institution?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  major?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  minor?: string

  @ApiPropertyOptional({ minimum: 0, maximum: 4 })
  @IsNumber()
  @Min(0)
  @Max(4)
  @IsOptional()
  gpa?: number

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  achievements?: string[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  certifications?: string[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  academicInterests?: string[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subjectStrengths?: string[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subjectsNeedImprovement?: string[]

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  intendedMajor?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetUniversity?: string

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  extracurricularActivities?: string[]
}