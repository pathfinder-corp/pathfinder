import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator'

import {
  MilestoneProgress,
  PhaseProgress
} from '../entities/roadmap-progress.entity'

export class UpdateProgressDto {
  @ApiProperty({
    description: 'Phase index to update (0-based)',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  phaseIndex?: number

  @ApiProperty({
    description: 'Step index within phase to update (0-based)',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stepIndex?: number

  @ApiProperty({
    description: 'Milestone index to update (0-based)',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  milestoneIndex?: number

  @ApiProperty({
    description: 'Completion status',
    required: true
  })
  @IsBoolean()
  completed!: boolean
}

export class ProgressResponseDto {
  @ApiProperty({ description: 'Progress record ID' })
  id!: string

  @ApiProperty({ description: 'Roadmap ID' })
  roadmapId!: string

  @ApiProperty({ description: 'Phase progress array', type: 'array' })
  phases!: PhaseProgress[]

  @ApiProperty({ description: 'Milestone progress array', type: 'array' })
  milestones!: MilestoneProgress[]

  @ApiProperty({ description: 'Overall progress percentage (0-100)' })
  overallProgress!: number

  @ApiProperty({ description: 'When user started the roadmap', nullable: true })
  startedAt?: Date | null

  @ApiProperty({
    description: 'When user completed the roadmap',
    nullable: true
  })
  completedAt?: Date | null

  @ApiProperty({ description: 'Record creation timestamp' })
  createdAt!: Date

  @ApiProperty({ description: 'Record last update timestamp' })
  updatedAt!: Date
}
