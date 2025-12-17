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

export enum ThreadType {
  APPLICATION = 'application',
  REQUEST = 'request',
  MENTORSHIP = 'mentorship'
}

export interface MessageAttachment {
  filename: string
  mimeType: string
  size: number
  // In stub mode, we don't store actual file data
  // Future: add url or storageKey for actual file storage
}

@Entity('messages')
@Index(['threadType', 'threadId'])
@Index(['senderId'])
@Index(['createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'thread_type', type: 'enum', enum: ThreadType })
  threadType: ThreadType

  @Column({ name: 'thread_id', type: 'uuid' })
  threadId: string

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender?: User

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'jsonb', nullable: true })
  attachments?: MessageAttachment[]

  @Column({ name: 'is_read', default: false })
  isRead: boolean

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date

  @Column({ name: 'is_system_message', default: false })
  isSystemMessage: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
