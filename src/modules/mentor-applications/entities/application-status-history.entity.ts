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
import {
  ApplicationStatus,
  MentorApplication
} from './mentor-application.entity'

@Entity('application_status_history')
@Index(['applicationId'])
export class ApplicationStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string

  @ManyToOne(() => MentorApplication, (app) => app.statusHistory, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'application_id' })
  application?: MentorApplication

  @Column({
    name: 'previous_status',
    type: 'enum',
    enum: ApplicationStatus,
    nullable: true
  })
  previousStatus?: ApplicationStatus

  @Column({
    name: 'new_status',
    type: 'enum',
    enum: ApplicationStatus
  })
  newStatus: ApplicationStatus

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy?: string

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by' })
  changedByUser?: User

  @Column({ type: 'text', nullable: true })
  reason?: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
