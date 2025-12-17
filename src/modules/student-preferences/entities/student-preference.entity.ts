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

export interface StudentPreferenceData {
  domains?: string[]
  goals?: string[]
  skills?: string[]
  language?: string
  languages?: string[]
  minYearsExperience?: number
  industries?: string[]
  additionalNotes?: string
}

@Entity('student_preferences')
@Index(['userId', 'version'])
@Index(['userId', 'createdAt'])
export class StudentPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User

  @Column({ type: 'int' })
  version: number

  @Column({ type: 'jsonb' })
  preferences: StudentPreferenceData

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
