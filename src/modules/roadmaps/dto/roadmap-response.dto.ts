import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

import { ExperienceLevel, LearningPace } from './generate-roadmap.dto'

export class RoadmapResourceDto {
  @ApiProperty({ example: 'Video Course' })
  type!: string

  @ApiProperty({ example: 'Frontend Masters: Complete Intro to React' })
  title!: string

  @ApiPropertyOptional({
    example: 'https://frontendmasters.com/courses/complete-react-v7/'
  })
  url?: string

  @ApiPropertyOptional({
    example: 'Project-oriented course to build competency with React 18.'
  })
  description?: string
}

export class RoadmapStepDto {
  @ApiProperty({ example: 'Master HTML & CSS fundamentals' })
  title!: string

  @ApiProperty({
    example:
      'Develop semantic HTML structure and responsive layouts using modern CSS.'
  })
  description!: string

  @ApiPropertyOptional({ example: '2 weeks' })
  estimatedDuration?: string

  @ApiPropertyOptional({
    type: [String],
    example: ['Build a personal portfolio landing page']
  })
  keyActivities?: string[]

  @ApiPropertyOptional({ type: () => [RoadmapResourceDto] })
  @Type(() => RoadmapResourceDto)
  resources?: RoadmapResourceDto[]
}

export class RoadmapPhaseDto {
  @ApiProperty({ example: 'Foundation' })
  title!: string

  @ApiProperty({
    example:
      'Build solid web development fundamentals and establish best practices.'
  })
  outcome!: string

  @ApiPropertyOptional({ example: '6 weeks' })
  estimatedDuration?: string

  @ApiProperty({ type: () => [RoadmapStepDto] })
  @Type(() => RoadmapStepDto)
  steps!: RoadmapStepDto[]
}

export class RoadmapMilestoneDto {
  @ApiProperty({ example: 'Launch a responsive personal website' })
  title!: string

  @ApiProperty({
    example: 'Demonstrate HTML/CSS mastery and responsive design skills.'
  })
  successCriteria!: string
}

export class RoadmapSummaryDto {
  @ApiPropertyOptional({ example: '5-8 hours per week' })
  recommendedCadence?: string

  @ApiPropertyOptional({ example: '3-6 months depending on pace' })
  recommendedDuration?: string

  @ApiPropertyOptional({
    type: [String],
    example: ['Track progress weekly', 'Share work publicly for feedback']
  })
  successTips?: string[]

  @ApiPropertyOptional({
    example:
      'Pair foundational learning with building portfolio-ready projects.'
  })
  additionalNotes?: string
}

export class RoadmapContentDto {
  @ApiProperty({ example: 'Full-stack web developer' })
  topic!: string

  @ApiPropertyOptional({ enum: ExperienceLevel })
  experienceLevel?: ExperienceLevel

  @ApiPropertyOptional({ enum: LearningPace })
  learningPace?: LearningPace

  @ApiPropertyOptional({ example: '6 months' })
  timeframe?: string

  @ApiProperty({ type: () => RoadmapSummaryDto })
  @Type(() => RoadmapSummaryDto)
  summary!: RoadmapSummaryDto

  @ApiProperty({ type: () => [RoadmapPhaseDto] })
  @Type(() => RoadmapPhaseDto)
  phases!: RoadmapPhaseDto[]

  @ApiPropertyOptional({ type: () => [RoadmapMilestoneDto] })
  @Type(() => RoadmapMilestoneDto)
  milestones?: RoadmapMilestoneDto[]

  // Additional properties may be defined in extending DTOs
}

export class RoadmapResponseDto extends RoadmapContentDto {
  @ApiProperty({ example: 'b8f82d24-5f0d-4b66-9df2-4388f080d2bf' })
  id!: string

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  createdAt!: string

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  updatedAt!: string
}
