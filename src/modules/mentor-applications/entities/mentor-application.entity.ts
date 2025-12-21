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

import { User } from '../../users/entities/user.entity'
import { ApplicationDocument } from './application-document.entity'
import { ApplicationStatusHistory } from './application-status-history.entity'
import { ApplicationStatus } from './application-status.enum'

@Entity('mentor_applications')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['ipHash'])
@Index(['isFlagged'])
export class MentorApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING
  })
  status: ApplicationStatus

  @Column({ type: 'jsonb', name: 'application_data' })
  applicationData: {
    headline?: string
    bio?: string
    expertise?: string[]
    skills?: string[]
    industries?: string[]
    languages?: string[]
    yearsExperience?: number
    linkedinUrl?: string
    portfolioUrl?: string
    motivation?: string
  }

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes?: string

  @Column({ name: 'decline_reason', type: 'text', nullable: true })
  declineReason?: string

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt?: Date

  @Column({ nullable: true, name: 'ip_hash' })
  ipHash?: string

  @Column({ type: 'jsonb', nullable: true, name: 'content_flags' })
  contentFlags?: {
    flaggedAt?: Date
    flagType?: string[]
    flagScore?: number
    flagReason?: string
  }

  @Column({ default: false, name: 'is_flagged' })
  isFlagged: boolean

  @OneToMany(() => ApplicationStatusHistory, (history) => history.application, {
    cascade: true
  })
  statusHistory?: ApplicationStatusHistory[]

  @OneToMany(() => ApplicationDocument, (doc) => doc.application, {
    cascade: true
  })
  documents?: ApplicationDocument[]

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
