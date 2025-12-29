import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

import { User } from '../../users/entities/user.entity'

export enum BadgeType {
  FIRST_ROADMAP = 'first_roadmap',
  ROADMAP_COMPLETE = 'roadmap_complete',
  PHASE_MASTER = 'phase_master',
  WEEK_STREAK = 'week_streak',
  MONTH_STREAK = 'month_streak',
  EARLY_BIRD = 'early_bird',
  NIGHT_OWL = 'night_owl',
  CONSISTENT_LEARNER = 'consistent_learner',
  SPEED_LEARNER = 'speed_learner',
  MILESTONE_ACHIEVER = 'milestone_achiever'
}

export enum BadgeTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond'
}

@Entity('user_gamification')
export class UserGamification {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({ name: 'total_xp', type: 'int', default: 0 })
  totalXp!: number

  @Column({ type: 'int', default: 1 })
  level!: number

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak!: number

  @Column({ name: 'longest_streak', type: 'int', default: 0 })
  longestStreak!: number

  @Column({ name: 'last_activity_date', type: 'date', nullable: true })
  lastActivityDate?: Date | null

  @Column({ name: 'roadmaps_completed', type: 'int', default: 0 })
  roadmapsCompleted!: number

  @Column({ name: 'phases_completed', type: 'int', default: 0 })
  phasesCompleted!: number

  @Column({ name: 'steps_completed', type: 'int', default: 0 })
  stepsCompleted!: number

  @Column({ name: 'milestones_completed', type: 'int', default: 0 })
  milestonesCompleted!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}

@Entity('user_badges')
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({
    type: 'enum',
    enum: BadgeType
  })
  type!: BadgeType

  @Column({
    type: 'enum',
    enum: BadgeTier,
    default: BadgeTier.BRONZE
  })
  tier!: BadgeTier

  @Column({ type: 'varchar', length: 100 })
  title!: string

  @Column({ type: 'text' })
  description!: string

  @Column({ name: 'icon_name', type: 'varchar', length: 50 })
  iconName!: string

  @Column({ name: 'xp_awarded', type: 'int', default: 0 })
  xpAwarded!: number

  @Column({ name: 'earned_at', type: 'timestamptz' })
  earnedAt!: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
