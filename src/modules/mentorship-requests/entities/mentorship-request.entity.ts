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

export enum RequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

@Entity('mentorship_requests')
@Index(['studentId', 'status'])
@Index(['mentorId', 'status'])
@Index(['expiresAt'])
export class MentorshipRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: User

  @Column({ name: 'mentor_id', type: 'uuid' })
  mentorId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentor_id' })
  mentor?: User

  @Column({ type: 'text', nullable: true })
  message?: string

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING
  })
  status: RequestStatus

  @Column({
    name: 'decline_reason',
    type: 'text',
    nullable: true
  })
  declineReason?: string

  @Column({
    name: 'expires_at',
    type: 'timestamptz'
  })
  expiresAt: Date

  @Column({
    name: 'responded_at',
    type: 'timestamptz',
    nullable: true
  })
  respondedAt?: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
