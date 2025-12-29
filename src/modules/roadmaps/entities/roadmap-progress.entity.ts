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
import { Roadmap } from './roadmap.entity'

export type StepProgress = {
  stepIndex: number
  completed: boolean
  completedAt?: Date | null
}

export type PhaseProgress = {
  phaseIndex: number
  completed: boolean
  completedAt?: Date | null
  steps: StepProgress[]
}

export type MilestoneProgress = {
  milestoneIndex: number
  completed: boolean
  completedAt?: Date | null
}

@Entity('roadmap_progress')
export class RoadmapProgress {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({ name: 'roadmap_id', type: 'uuid' })
  roadmapId!: string

  @ManyToOne(() => Roadmap, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roadmap_id' })
  roadmap!: Roadmap

  @Column({ type: 'jsonb', default: '[]' })
  phases!: PhaseProgress[]

  @Column({ type: 'jsonb', default: '[]' })
  milestones!: MilestoneProgress[]

  @Column({
    name: 'overall_progress',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0
  })
  overallProgress!: number

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
