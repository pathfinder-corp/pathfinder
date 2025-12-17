import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator'

export class SearchMentorsQueryDto {
  @ApiPropertyOptional({ description: 'Search in name, headline, bio' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by expertise areas'
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value?.split(',')))
  @IsArray()
  @IsString({ each: true })
  expertise?: string[]

  @ApiPropertyOptional({ type: [String], description: 'Filter by skills' })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value?.split(',')))
  @IsArray()
  @IsString({ each: true })
  skills?: string[]

  @ApiPropertyOptional({ type: [String], description: 'Filter by industries' })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value?.split(',')))
  @IsArray()
  @IsString({ each: true })
  industries?: string[]

  @ApiPropertyOptional({ type: [String], description: 'Filter by languages' })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value?.split(',')))
  @IsArray()
  @IsString({ each: true })
  languages?: string[]

  @ApiPropertyOptional({ description: 'Minimum years of experience' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  minYearsExperience?: number

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  offset?: number = 0
}
