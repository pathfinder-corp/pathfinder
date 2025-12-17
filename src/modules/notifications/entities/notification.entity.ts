import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm'

import { User } from '../../users/entities/user.entity'

export enum NotificationType {
  // Application notifications
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_APPROVED = 'application_approved',
  APPLICATION_DECLINED = 'application_declined',

  // Request notifications
  REQUEST_RECEIVED = 'request_received',
  REQUEST_ACCEPTED = 'request_accepted',
  REQUEST_DECLINED = 'request_declined',
  REQUEST_CANCELLED = 'request_cancelled',
  REQUEST_EXPIRED = 'request_expired',

  // Meeting notifications
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_RESCHEDULED = 'meeting_rescheduled',
  MEETING_CANCELLED = 'meeting_cancelled',
  MEETING_REMINDER = 'meeting_reminder',

  // Mentorship notifications
  MENTORSHIP_STARTED = 'mentorship_started',
  MENTORSHIP_ENDED = 'mentorship_ended',

  // Message notifications
  NEW_MESSAGE = 'new_message'
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User

  @Column({
    type: 'enum',
    enum: NotificationType
  })
  type: NotificationType

  @Column({ length: 255 })
  title: string

  @Column({ type: 'text', nullable: true })
  message?: string

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, any>

  @Column({ name: 'is_read', default: false })
  isRead: boolean

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
