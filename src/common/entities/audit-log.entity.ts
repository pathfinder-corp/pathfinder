import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm'

import { User } from '../../modules/users/entities/user.entity'

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['actorId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor?: User

  @Column({ length: 100 })
  action: string

  @Column({ name: 'entity_type', length: 100 })
  entityType: string

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string

  @Column({ type: 'jsonb', nullable: true })
  changes?: Record<string, any>

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
