import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

import { User } from '../../users/entities/user.entity'
import { AssessmentQuestion } from './assessment-question.entity'
import { AssessmentResponse } from './assessment-response.entity'
import { AssessmentResult } from './assessment-result.entity'

export enum AssessmentDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum AssessmentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

@Entity('assessments')
export class Assessment {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Column({ name: 'original_assessment_id', type: 'uuid', nullable: true })
  originalAssessmentId?: string | null

  @ManyToOne(() => Assessment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'original_assessment_id' })
  originalAssessment?: Assessment | null

  @Column({ name: 'attempt_number', type: 'int', default: 1 })
  attemptNumber!: number

  @ManyToOne(() => User, (user) => user.assessments, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column()
  domain!: string

  @Column({
    type: 'enum',
    enum: AssessmentDifficulty,
    default: AssessmentDifficulty.MEDIUM
  })
  difficulty!: AssessmentDifficulty

  @Column({ name: 'question_count', type: 'int', default: 15 })
  questionCount!: number

  @Column({
    type: 'enum',
    enum: AssessmentStatus,
    default: AssessmentStatus.PENDING
  })
  status!: AssessmentStatus

  @OneToMany(() => AssessmentQuestion, (question) => question.assessment, {
    cascade: true
  })
  questions?: AssessmentQuestion[]

  @OneToMany(() => AssessmentResponse, (response) => response.assessment)
  responses?: AssessmentResponse[]

  @OneToOne(() => AssessmentResult, (result) => result.assessment)
  result?: AssessmentResult

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
