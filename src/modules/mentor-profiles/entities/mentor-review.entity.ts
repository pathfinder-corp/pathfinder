import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

import { Mentorship } from '../../mentorships/entities/mentorship.entity'
import { User } from '../../users/entities/user.entity'

@Entity('mentor_reviews')
@Index(['mentorId', 'studentId'], { unique: true })
@Index(['mentorId'])
@Index(['studentId'])
@Index(['mentorshipId'])
export class MentorReview {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'mentor_id', type: 'uuid' })
  mentorId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentor_id' })
  mentor?: User

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: User

  @Column({
    name: 'mentorship_id',
    type: 'uuid',
    nullable: true
  })
  mentorshipId?: string

  @ManyToOne(() => Mentorship, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'mentorship_id' })
  mentorship?: Mentorship

  @Column({ type: 'int' })
  rating: number

  @Column({ type: 'text', nullable: true })
  feedback?: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
