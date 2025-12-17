import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique
} from 'typeorm'

import { User } from '../../users/entities/user.entity'
import { Assessment } from './assessment.entity'

@Entity('assessment_shares')
@Unique(['assessmentId', 'sharedWithUserId'])
export class AssessmentShare {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'assessment_id', type: 'uuid' })
  assessmentId!: string

  @ManyToOne(() => Assessment, (assessment) => assessment.shares, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'assessment_id' })
  assessment!: Assessment

  @Column({ name: 'shared_with_user_id', type: 'uuid' })
  sharedWithUserId!: string

  @ManyToOne(() => User, (user) => user.sharedAssessments, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'shared_with_user_id' })
  sharedWith!: User

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
