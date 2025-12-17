import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm'

import { AssessmentQuestion } from './assessment-question.entity'
import { Assessment } from './assessment.entity'

@Entity('assessment_responses')
export class AssessmentResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'assessment_id', type: 'uuid' })
  assessmentId!: string

  @ManyToOne(() => Assessment, (assessment) => assessment.responses, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'assessment_id' })
  assessment!: Assessment

  @Column({ name: 'question_id', type: 'uuid' })
  questionId!: string

  @ManyToOne(() => AssessmentQuestion, (question) => question.responses, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'question_id' })
  question!: AssessmentQuestion

  @Column({ name: 'selected_answer_index', type: 'int' })
  selectedAnswerIndex!: number

  @Column({ name: 'is_correct', type: 'boolean' })
  isCorrect!: boolean

  @Column({ name: 'time_spent', type: 'int', nullable: true })
  timeSpent?: number | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
