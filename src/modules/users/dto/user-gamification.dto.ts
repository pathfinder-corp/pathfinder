import { ApiProperty } from '@nestjs/swagger'

import { BadgeTier, BadgeType } from '../entities/user-gamification.entity'

export class GamificationStatsDto {
  @ApiProperty({ description: 'User ID' })
  userId!: string

  @ApiProperty({ description: 'Total XP earned' })
  totalXp!: number

  @ApiProperty({ description: 'Current level' })
  level!: number

  @ApiProperty({ description: 'XP needed for next level' })
  xpToNextLevel!: number

  @ApiProperty({ description: 'Current learning streak (days)' })
  currentStreak!: number

  @ApiProperty({ description: 'Longest learning streak (days)' })
  longestStreak!: number

  @ApiProperty({ description: 'Total roadmaps completed' })
  roadmapsCompleted!: number

  @ApiProperty({ description: 'Total phases completed' })
  phasesCompleted!: number

  @ApiProperty({ description: 'Total steps completed' })
  stepsCompleted!: number

  @ApiProperty({ description: 'Total milestones completed' })
  milestonesCompleted!: number

  @ApiProperty({ description: 'Last activity date', nullable: true })
  lastActivityDate?: Date | null

  @ApiProperty({ description: 'Badges earned count' })
  badgesCount!: number
}

export class BadgeDto {
  @ApiProperty({ description: 'Badge ID' })
  id!: string

  @ApiProperty({ description: 'Badge type', enum: BadgeType })
  type!: BadgeType

  @ApiProperty({ description: 'Badge tier', enum: BadgeTier })
  tier!: BadgeTier

  @ApiProperty({ description: 'Badge title' })
  title!: string

  @ApiProperty({ description: 'Badge description' })
  description!: string

  @ApiProperty({ description: 'Icon name' })
  iconName!: string

  @ApiProperty({ description: 'XP awarded for earning this badge' })
  xpAwarded!: number

  @ApiProperty({ description: 'When badge was earned' })
  earnedAt!: Date
}

export class LeaderboardEntryDto {
  @ApiProperty({ description: 'User ID' })
  userId!: string

  @ApiProperty({ description: 'User display name' })
  displayName!: string

  @ApiProperty({ description: 'Total XP' })
  totalXp!: number

  @ApiProperty({ description: 'Current level' })
  level!: number

  @ApiProperty({ description: 'Rank position' })
  rank!: number

  @ApiProperty({ description: 'Badges earned count' })
  badgesCount!: number
}
