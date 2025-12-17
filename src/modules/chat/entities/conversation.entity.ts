import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

import { Mentorship } from '../../mentorships/entities/mentorship.entity'
import { User } from '../../users/entities/user.entity'
import { Message } from './message.entity'

@Entity('conversations')
@Index(['mentorshipId'])
@Index(['participant1Id', 'participant2Id'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'mentorship_id', type: 'uuid', unique: true })
  mentorshipId: string

  @ManyToOne(() => Mentorship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentorship_id' })
  mentorship?: Mentorship

  @Column({ name: 'participant1_id', type: 'uuid' })
  participant1Id: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant1_id' })
  participant1?: User

  @Column({ name: 'participant2_id', type: 'uuid' })
  participant2Id: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant2_id' })
  participant2?: User

  @OneToMany(() => Message, (message) => message.conversation)
  messages?: Message[]

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt?: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
