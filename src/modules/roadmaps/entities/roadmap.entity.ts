import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

import { User } from '../../users/entities/user.entity'
import { ExperienceLevel, LearningPace } from '../dto/generate-roadmap.dto'

export type RoadmapResource = {
  type: string
  title: string
  url?: string | null
  description?: string | null
}

export type RoadmapStep = {
  title: string
  description: string
  estimatedDuration?: string | null
  keyActivities?: string[] | null
  resources?: RoadmapResource[] | null
}

export type RoadmapPhase = {
  title: string
  outcome: string
  estimatedDuration?: string | null
  steps: RoadmapStep[]
}

export type RoadmapMilestone = {
  title: string
  successCriteria: string
}

export type RoadmapSummary = {
  recommendedCadence?: string | null
  recommendedDuration?: string | null
  successTips?: string[] | null
  additionalNotes?: string | null
}

export type RoadmapRequestContext = {
  topic: string
  background?: string | null
  targetOutcome?: string | null
  experienceLevel?: ExperienceLevel | null
  learningPace?: LearningPace | null
  timeframe?: string | null
  preferences?: string | null
}

@Entity('roadmaps')
export class Roadmap {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @ManyToOne(() => User, (user) => user.roadmaps, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column()
  topic!: string

  @Column({
    type: 'enum',
    enum: ExperienceLevel,
    nullable: true
  })
  experienceLevel?: ExperienceLevel | null

  @Column({
    type: 'enum',
    enum: LearningPace,
    nullable: true
  })
  learningPace?: LearningPace | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  timeframe?: string | null

  @Column({ type: 'jsonb' })
  summary!: RoadmapSummary

  @Column({ type: 'jsonb' })
  phases!: RoadmapPhase[]

  @Column({ type: 'jsonb', nullable: true })
  milestones?: RoadmapMilestone[] | null

  @Column({ type: 'jsonb', nullable: true })
  requestContext?: RoadmapRequestContext | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
