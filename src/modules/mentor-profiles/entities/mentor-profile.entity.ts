import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

import { User } from '../../users/entities/user.entity'

@Entity('mentor_profiles')
@Index(['isActive'])
export class MentorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User

  @Column({ length: 200, nullable: true })
  headline?: string

  @Column({ type: 'text', nullable: true })
  bio?: string

  @Column({ type: 'jsonb', default: [] })
  expertise: string[]

  @Column({ type: 'jsonb', default: [] })
  skills: string[]

  @Column({ type: 'jsonb', default: [] })
  industries: string[]

  @Column({ type: 'jsonb', default: [] })
  languages: string[]

  @Column({ name: 'years_experience', type: 'int', nullable: true })
  yearsExperience?: number

  @Column({ name: 'linkedin_url', length: 500, nullable: true })
  linkedinUrl?: string

  @Column({ name: 'portfolio_url', length: 500, nullable: true })
  portfolioUrl?: string

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @Column({ name: 'is_accepting_mentees', default: true })
  isAcceptingMentees: boolean

  @Column({ name: 'max_mentees', type: 'int', nullable: true })
  maxMentees?: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
