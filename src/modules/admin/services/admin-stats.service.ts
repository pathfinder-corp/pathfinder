import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Assessment } from '../../assessments/entities/assessment.entity'
import { Roadmap } from '../../roadmaps/entities/roadmap.entity'
import { User } from '../../users/entities/user.entity'
import {
  AssessmentStatsDto,
  OverviewStatsDto,
  RoadmapStatsDto,
  UserStatsDto
} from '../dto/dashboard-stats.dto'

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Roadmap)
    private readonly roadmapsRepository: Repository<Roadmap>,
    @InjectRepository(Assessment)
    private readonly assessmentsRepository: Repository<Assessment>
  ) {}

  async getOverviewStats(): Promise<OverviewStatsDto> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [
      totalUsers,
      totalRoadmaps,
      totalAssessments,
      newUsersLast7Days,
      newRoadmapsLast7Days,
      newAssessmentsLast7Days
    ] = await Promise.all([
      this.usersRepository.count(),
      this.roadmapsRepository.count(),
      this.assessmentsRepository.count(),
      this.usersRepository
        .createQueryBuilder('user')
        .where('user.createdAt >= :date', { date: sevenDaysAgo })
        .getCount(),
      this.roadmapsRepository
        .createQueryBuilder('roadmap')
        .where('roadmap.createdAt >= :date', { date: sevenDaysAgo })
        .getCount(),
      this.assessmentsRepository
        .createQueryBuilder('assessment')
        .where('assessment.createdAt >= :date', { date: sevenDaysAgo })
        .getCount()
    ])

    return {
      totalUsers,
      totalRoadmaps,
      totalAssessments,
      newUsersLast7Days,
      newRoadmapsLast7Days,
      newAssessmentsLast7Days
    }
  }

  async getUserStats(): Promise<UserStatsDto> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [byRole, byStatus, registrationTrend] = await Promise.all([
      this.usersRepository
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('user.role')
        .getRawMany(),
      this.usersRepository
        .createQueryBuilder('user')
        .select('user.status', 'status')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('user.status')
        .getRawMany(),
      this.usersRepository
        .createQueryBuilder('user')
        .select("TO_CHAR(user.createdAt, 'YYYY-MM-DD')", 'date')
        .addSelect('COUNT(*)::int', 'count')
        .where('user.createdAt >= :date', { date: thirtyDaysAgo })
        .groupBy("TO_CHAR(user.createdAt, 'YYYY-MM-DD')")
        .orderBy('date', 'ASC')
        .getRawMany()
    ])

    return {
      byRole,
      byStatus,
      registrationTrend
    }
  }

  async getRoadmapStats(): Promise<RoadmapStatsDto> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [total, sharedCount, popularTopics, generationTrend] =
      await Promise.all([
        this.roadmapsRepository.count(),
        this.roadmapsRepository.count({ where: { isSharedWithAll: true } }),
        this.roadmapsRepository
          .createQueryBuilder('roadmap')
          .select('roadmap.topic', 'topic')
          .addSelect('COUNT(*)::int', 'count')
          .groupBy('roadmap.topic')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany(),
        this.roadmapsRepository
          .createQueryBuilder('roadmap')
          .select("TO_CHAR(roadmap.createdAt, 'YYYY-MM-DD')", 'date')
          .addSelect('COUNT(*)::int', 'count')
          .where('roadmap.createdAt >= :date', { date: thirtyDaysAgo })
          .groupBy("TO_CHAR(roadmap.createdAt, 'YYYY-MM-DD')")
          .orderBy('date', 'ASC')
          .getRawMany()
      ])

    return {
      total,
      sharedCount,
      popularTopics,
      generationTrend
    }
  }

  async getAssessmentStats(): Promise<AssessmentStatsDto> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [total, byStatus, byDifficulty, popularDomains, creationTrend] =
      await Promise.all([
        this.assessmentsRepository.count(),
        this.assessmentsRepository
          .createQueryBuilder('assessment')
          .select('assessment.status', 'status')
          .addSelect('COUNT(*)::int', 'count')
          .groupBy('assessment.status')
          .getRawMany(),
        this.assessmentsRepository
          .createQueryBuilder('assessment')
          .select('assessment.difficulty', 'difficulty')
          .addSelect('COUNT(*)::int', 'count')
          .groupBy('assessment.difficulty')
          .getRawMany(),
        this.assessmentsRepository
          .createQueryBuilder('assessment')
          .select('assessment.domain', 'domain')
          .addSelect('COUNT(*)::int', 'count')
          .groupBy('assessment.domain')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany(),
        this.assessmentsRepository
          .createQueryBuilder('assessment')
          .select("TO_CHAR(assessment.createdAt, 'YYYY-MM-DD')", 'date')
          .addSelect('COUNT(*)::int', 'count')
          .where('assessment.createdAt >= :date', { date: thirtyDaysAgo })
          .groupBy("TO_CHAR(assessment.createdAt, 'YYYY-MM-DD')")
          .orderBy('date', 'ASC')
          .getRawMany()
      ])

    return {
      total,
      byStatus,
      byDifficulty,
      popularDomains,
      creationTrend
    }
  }
}
