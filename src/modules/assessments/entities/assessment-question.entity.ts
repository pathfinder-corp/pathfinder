import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm'

import { Assessment } from './assessment.entity'
import { AssessmentResponse } from './assessment-response.entity'

export type QuestionResource = {
  type: string
  title: string
  url?: string | null
  description?: string | null
}

@Entity('assessment_questions')
export class AssessmentQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'assessment_id', type: 'uuid' })
  assessmentId!: string

  @ManyToOne(() => Assessment, (assessment) => assessment.questions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'assessment_id' })
  assessment!: Assessment

  @Column({ name: 'question_text', type: 'text' })
  questionText!: string

  @Column({ type: 'jsonb' })
  options!: string[]

  @Column({ name: 'correct_answer_index', type: 'int' })
  correctAnswerIndex!: number

  @Column({ type: 'text' })
  explanation!: string

  @Column({ name: 'order_index', type: 'int' })
  orderIndex!: number

  @Column({ type: 'jsonb', nullable: true })
  resources?: QuestionResource[] | null

  @OneToMany(() => AssessmentResponse, (response) => response.question)
  responses?: AssessmentResponse[]
}


