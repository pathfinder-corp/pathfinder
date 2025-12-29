import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  BadgeTier,
  BadgeType,
  UserBadge,
  UserGamification
} from '../entities/user-gamification.entity'

interface BadgeConfig {
  type: BadgeType
  tier: BadgeTier
  title: string
  description: string
  iconName: string
  xpReward: number
  checkCondition: (stats: UserGamification) => boolean
}

@Injectable()
export class UserGamificationService {
  private readonly logger = new Logger(UserGamificationService.name)

  // XP required for each level (exponential growth)
  private readonly XP_PER_LEVEL = (level: number): number => {
    return Math.floor(100 * Math.pow(1.5, level - 1))
  }

  // XP rewards for different actions
  private readonly XP_REWARDS = {
    STEP_COMPLETE: 10,
    PHASE_COMPLETE: 50,
    MILESTONE_COMPLETE: 75,
    ROADMAP_COMPLETE: 200,
    DAILY_STREAK: 20
  }

  private readonly BADGE_CONFIGS: BadgeConfig[] = [
    {
      type: BadgeType.FIRST_ROADMAP,
      tier: BadgeTier.BRONZE,
      title: 'Getting Started',
      description: 'Created your first learning roadmap',
      iconName: 'map',
      xpReward: 50,
      checkCondition: (stats) => stats.roadmapsCompleted >= 1
    },
    {
      type: BadgeType.ROADMAP_COMPLETE,
      tier: BadgeTier.SILVER,
      title: 'Journey Complete',
      description: 'Completed 3 learning roadmaps',
      iconName: 'trophy',
      xpReward: 150,
      checkCondition: (stats) => stats.roadmapsCompleted >= 3
    },
    {
      type: BadgeType.ROADMAP_COMPLETE,
      tier: BadgeTier.GOLD,
      title: 'Master Navigator',
      description: 'Completed 10 learning roadmaps',
      iconName: 'trophy',
      xpReward: 500,
      checkCondition: (stats) => stats.roadmapsCompleted >= 10
    },
    {
      type: BadgeType.PHASE_MASTER,
      tier: BadgeTier.BRONZE,
      title: 'Phase Finisher',
      description: 'Completed 10 phases',
      iconName: 'check-circle',
      xpReward: 100,
      checkCondition: (stats) => stats.phasesCompleted >= 10
    },
    {
      type: BadgeType.PHASE_MASTER,
      tier: BadgeTier.SILVER,
      title: 'Phase Champion',
      description: 'Completed 50 phases',
      iconName: 'check-circle',
      xpReward: 300,
      checkCondition: (stats) => stats.phasesCompleted >= 50
    },
    {
      type: BadgeType.WEEK_STREAK,
      tier: BadgeTier.BRONZE,
      title: 'Week Warrior',
      description: 'Maintained a 7-day learning streak',
      iconName: 'flame',
      xpReward: 100,
      checkCondition: (stats) => stats.currentStreak >= 7
    },
    {
      type: BadgeType.MONTH_STREAK,
      tier: BadgeTier.GOLD,
      title: 'Consistency King',
      description: 'Maintained a 30-day learning streak',
      iconName: 'flame',
      xpReward: 500,
      checkCondition: (stats) => stats.currentStreak >= 30
    },
    {
      type: BadgeType.CONSISTENT_LEARNER,
      tier: BadgeTier.SILVER,
      title: 'Dedicated Learner',
      description: 'Completed 100 learning steps',
      iconName: 'book-open',
      xpReward: 200,
      checkCondition: (stats) => stats.stepsCompleted >= 100
    },
    {
      type: BadgeType.MILESTONE_ACHIEVER,
      tier: BadgeTier.BRONZE,
      title: 'Milestone Maker',
      description: 'Reached 10 milestones',
      iconName: 'flag',
      xpReward: 150,
      checkCondition: (stats) => stats.milestonesCompleted >= 10
    }
  ]

  constructor(
    @InjectRepository(UserGamification)
    private readonly gamificationRepository: Repository<UserGamification>,
    @InjectRepository(UserBadge)
    private readonly badgeRepository: Repository<UserBadge>
  ) {}

  async getOrCreateGamification(userId: string): Promise<UserGamification> {
    let gamification = await this.gamificationRepository.findOne({
      where: { userId }
    })

    if (!gamification) {
      gamification = this.gamificationRepository.create({
        userId,
        totalXp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        roadmapsCompleted: 0,
        phasesCompleted: 0,
        stepsCompleted: 0,
        milestonesCompleted: 0
      })
      gamification = await this.gamificationRepository.save(gamification)
    }

    return gamification
  }

  async awardXP(
    userId: string,
    xpAmount: number,
    reason: string
  ): Promise<{ newBadges: UserBadge[]; leveledUp: boolean; newLevel: number }> {
    const gamification = await this.getOrCreateGamification(userId)
    const oldLevel = gamification.level

    gamification.totalXp += xpAmount

    // Calculate new level
    let newLevel = 1
    let xpRequired = 0
    while (xpRequired <= gamification.totalXp) {
      xpRequired += this.XP_PER_LEVEL(newLevel)
      newLevel++
    }
    newLevel = Math.max(1, newLevel - 1)

    gamification.level = newLevel
    await this.gamificationRepository.save(gamification)

    // Check for new badges
    const newBadges = await this.checkAndAwardBadges(userId, gamification)

    this.logger.log(
      `Awarded ${xpAmount} XP to user ${userId} for ${reason}. New level: ${newLevel}`
    )

    return {
      newBadges,
      leveledUp: newLevel > oldLevel,
      newLevel
    }
  }

  async updateStreak(userId: string): Promise<UserGamification> {
    const gamification = await this.getOrCreateGamification(userId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastActivity = gamification.lastActivityDate
      ? new Date(gamification.lastActivityDate)
      : null

    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0)

      const daysDifference = Math.floor(
        (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysDifference === 0) {
        // Same day, no change
        return gamification
      } else if (daysDifference === 1) {
        // Next day, increment streak
        gamification.currentStreak += 1
        gamification.longestStreak = Math.max(
          gamification.longestStreak,
          gamification.currentStreak
        )
      } else {
        // Streak broken
        gamification.currentStreak = 1
      }
    } else {
      // First activity
      gamification.currentStreak = 1
      gamification.longestStreak = 1
    }

    gamification.lastActivityDate = today
    await this.gamificationRepository.save(gamification)

    // Award XP for maintaining streak
    if (gamification.currentStreak > 1) {
      await this.awardXP(
        userId,
        this.XP_REWARDS.DAILY_STREAK,
        `${gamification.currentStreak}-day streak`
      )
    }

    // Check for streak badges
    await this.checkAndAwardBadges(userId, gamification)

    return gamification
  }

  async onStepComplete(userId: string): Promise<void> {
    const gamification = await this.getOrCreateGamification(userId)
    gamification.stepsCompleted += 1
    await this.gamificationRepository.save(gamification)

    await this.updateStreak(userId)
    await this.awardXP(userId, this.XP_REWARDS.STEP_COMPLETE, 'step completed')
  }

  async onPhaseComplete(userId: string): Promise<void> {
    const gamification = await this.getOrCreateGamification(userId)
    gamification.phasesCompleted += 1
    await this.gamificationRepository.save(gamification)

    await this.updateStreak(userId)
    await this.awardXP(
      userId,
      this.XP_REWARDS.PHASE_COMPLETE,
      'phase completed'
    )
  }

  async onMilestoneComplete(userId: string): Promise<void> {
    const gamification = await this.getOrCreateGamification(userId)
    gamification.milestonesCompleted += 1
    await this.gamificationRepository.save(gamification)

    await this.updateStreak(userId)
    await this.awardXP(
      userId,
      this.XP_REWARDS.MILESTONE_COMPLETE,
      'milestone completed'
    )
  }

  async onRoadmapComplete(userId: string): Promise<void> {
    const gamification = await this.getOrCreateGamification(userId)
    gamification.roadmapsCompleted += 1
    await this.gamificationRepository.save(gamification)

    await this.updateStreak(userId)
    await this.awardXP(
      userId,
      this.XP_REWARDS.ROADMAP_COMPLETE,
      'roadmap completed'
    )
  }

  private async checkAndAwardBadges(
    userId: string,
    gamification: UserGamification
  ): Promise<UserBadge[]> {
    const existingBadges = await this.badgeRepository.find({
      where: { userId }
    })

    const existingBadgeKeys = new Set(
      existingBadges.map((b) => `${b.type}-${b.tier}`)
    )

    const newBadges: UserBadge[] = []

    for (const config of this.BADGE_CONFIGS) {
      const badgeKey = `${config.type}-${config.tier}`

      if (
        !existingBadgeKeys.has(badgeKey) &&
        config.checkCondition(gamification)
      ) {
        const badge = this.badgeRepository.create({
          userId,
          type: config.type,
          tier: config.tier,
          title: config.title,
          description: config.description,
          iconName: config.iconName,
          xpAwarded: config.xpReward,
          earnedAt: new Date()
        })

        const savedBadge = await this.badgeRepository.save(badge)
        newBadges.push(savedBadge)

        // Award XP for earning badge
        gamification.totalXp += config.xpReward
        await this.gamificationRepository.save(gamification)

        this.logger.log(
          `User ${userId} earned badge: ${config.title} (${config.tier})`
        )
      }
    }

    return newBadges
  }

  async getUserStats(userId: string) {
    const gamification = await this.getOrCreateGamification(userId)
    const badges = await this.badgeRepository.find({
      where: { userId },
      order: { earnedAt: 'DESC' }
    })

    const xpToNextLevel =
      this.XP_PER_LEVEL(gamification.level + 1) -
      (gamification.totalXp -
        Array.from({ length: gamification.level }, (_, i) =>
          this.XP_PER_LEVEL(i + 1)
        ).reduce((sum, xp) => sum + xp, 0))

    return {
      ...gamification,
      xpToNextLevel,
      badgesCount: badges.length,
      badges
    }
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return this.badgeRepository.find({
      where: { userId },
      order: { earnedAt: 'DESC' }
    })
  }

  async getLeaderboard(limit: number = 10) {
    const topUsers = await this.gamificationRepository.find({
      order: { totalXp: 'DESC' },
      take: limit,
      relations: ['user']
    })

    return Promise.all(
      topUsers.map(async (gamification, index) => {
        const badgesCount = await this.badgeRepository.count({
          where: { userId: gamification.userId }
        })

        return {
          userId: gamification.userId,
          displayName: gamification.user?.firstName || 'Anonymous',
          totalXp: gamification.totalXp,
          level: gamification.level,
          rank: index + 1,
          badgesCount
        }
      })
    )
  }
}
