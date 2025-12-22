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
import { Conversation } from './conversation.entity'

export enum MessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  IMAGE = 'image',
  FILE = 'file'
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId'])
@Index(['parentMessageId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: Conversation

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender?: User

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT
  })
  type: MessageType

  @Column({ type: 'text' })
  content: string

  @Column({ name: 'parent_message_id', type: 'uuid', nullable: true })
  parentMessageId?: string

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_message_id' })
  parentMessage?: Message

  @Column({ name: 'is_edited', default: false })
  isEdited: boolean

  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt?: Date

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl?: string

  @Column({ name: 'attachment_thumbnail_url', type: 'text', nullable: true })
  attachmentThumbnailUrl?: string

  @Column({ name: 'attachment_file_id', type: 'text', nullable: true })
  attachmentFileId?: string

  @Column({ name: 'attachment_file_name', type: 'text', nullable: true })
  attachmentFileName?: string

  @Column({ name: 'attachment_mime_type', type: 'text', nullable: true })
  attachmentMimeType?: string

  @Column({ name: 'attachment_size', type: 'bigint', nullable: true })
  attachmentSize?: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
