import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator'
import { CourseCategory, CourseLevel } from '../entities/course.entity'

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsString()
  description: string

  @ApiProperty({ enum: CourseCategory })
  @IsEnum(CourseCategory)
  category: CourseCategory

  @ApiProperty({ enum: CourseLevel })
  @IsEnum(CourseLevel)
  level: CourseLevel

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  credits?: number

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  prerequisites?: string[]

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[]

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  durationHours?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  provider?: string

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnail?: string

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

