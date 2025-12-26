import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator'

import {
  ExperienceLevel,
  LearningPace
} from '../../roadmaps/dto/generate-roadmap.dto'
import { PaginationQueryDto } from './pagination.dto'

export class AdminRoadmapQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string

  @ApiPropertyOptional({ description: 'Search by topic' })
  @IsOptional()
  @IsString()
  topic?: string

  @ApiPropertyOptional({ description: 'Filter by shared status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSharedWithAll?: boolean
}

export class RoadmapOwnerDto {
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

export class AdminRoadmapResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  topic: string

  @ApiPropertyOptional({ enum: ExperienceLevel })
  @Expose()
  experienceLevel?: ExperienceLevel

  @ApiPropertyOptional({ enum: LearningPace })
  @Expose()
  learningPace?: LearningPace

  @ApiPropertyOptional()
  @Expose()
  timeframe?: string

  @ApiProperty()
  @Expose()
  isSharedWithAll: boolean

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date

  @ApiProperty({ type: RoadmapOwnerDto })
  @Expose()
  @Type(() => RoadmapOwnerDto)
  owner: RoadmapOwnerDto
}

export class AdminRoadmapDetailResponseDto extends AdminRoadmapResponseDto {
  @ApiProperty()
  @Expose()
  summary: Record<string, unknown>

  @ApiProperty()
  @Expose()
  phases: Record<string, unknown>[]

  @ApiPropertyOptional()
  @Expose()
  milestones?: Record<string, unknown>[]

  @ApiProperty()
  @Expose()
  shareCount: number
}
