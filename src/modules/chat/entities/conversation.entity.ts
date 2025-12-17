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

import { Message, ThreadType } from '../../messages/entities/message.entity'

@Entity('conversations')
@Index(['threadType', 'threadId'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'thread_type', type: 'enum', enum: ThreadType })
  threadType: ThreadType

  @Column({ name: 'thread_id', type: 'uuid' })
  threadId: string

  @Column({ name: 'last_message_id', type: 'uuid', nullable: true })
  lastMessageId?: string

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_message_id' })
  lastMessage?: Message

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt?: Date

  @Column({
    name: 'last_message_preview',
    type: 'varchar',
    length: 100,
    nullable: true
  })
  lastMessagePreview?: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
