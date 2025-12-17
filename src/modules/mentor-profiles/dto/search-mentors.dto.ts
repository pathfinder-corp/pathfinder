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

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC'
}

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

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20)
  }

  get take(): number {
    return this.limit ?? 20
  }
}
