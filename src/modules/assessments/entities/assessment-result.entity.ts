import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn
} from 'typeorm'

import { Assessment } from './assessment.entity'

export type PerformanceSummary = {
  overallAssessment: string
  strengths: string[]
  weaknesses: string[]
  topicsToReview: string[]
  studyRecommendations: string[]
}

export type SuggestedRoadmap = {
  topic: string
}

@Entity('assessment_results')
export class AssessmentResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'assessment_id', type: 'uuid', unique: true })
  assessmentId!: string

  @OneToOne(() => Assessment, (assessment) => assessment.result, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'assessment_id' })
  assessment!: Assessment

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score!: number

  @Column({ name: 'correct_count', type: 'int' })
  correctCount!: number

  @Column({ name: 'total_questions', type: 'int' })
  totalQuestions!: number

  @Column({ type: 'jsonb' })
  summary!: PerformanceSummary

  @Column({ name: 'suggested_roadmaps', type: 'jsonb', nullable: true })
  suggestedRoadmaps?: SuggestedRoadmap[] | null

  @CreateDateColumn({ name: 'completed_at' })
  completedAt!: Date
}
