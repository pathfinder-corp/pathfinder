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

export enum ContactType {
  GENERAL = 'general',
  SUSPENDED = 'suspended',
  FEEDBACK = 'feedback',
  SUPPORT = 'support'
}

export enum ContactStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

@Entity('contact_messages')
@Index(['userId'])
@Index(['status'])
@Index(['type'])
@Index(['createdAt'])
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 255 })
  name: string

  @Column({ length: 255 })
  email: string

  @Column({ length: 500, nullable: true })
  subject?: string

  @Column({ type: 'text' })
  message: string

  @Column({
    type: 'enum',
    enum: ContactType,
    default: ContactType.GENERAL
  })
  type: ContactType

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User

  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.PENDING
  })
  status: ContactStatus

  @Column({ name: 'admin_response', type: 'text', nullable: true })
  adminResponse?: string

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt?: Date

  @Column({ name: 'responded_by', type: 'uuid', nullable: true })
  respondedBy?: string

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responded_by' })
  respondedByUser?: User

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
