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

import { User } from '../../users/entities/user.entity'

export enum MentorshipStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled'
}

@Entity('mentorships')
@Index(['mentorId', 'studentId', 'status'])
@Index(['mentorId', 'status'])
@Index(['studentId', 'status'])
export class Mentorship {
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
    type: 'enum',
    enum: MentorshipStatus,
    default: MentorshipStatus.ACTIVE
  })
  status: MentorshipStatus

  @Column({ name: 'end_reason', type: 'text', nullable: true })
  endReason?: string

  @Column({ name: 'ended_by', type: 'uuid', nullable: true })
  endedBy?: string

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ended_by' })
  endedByUser?: User

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt: Date

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
