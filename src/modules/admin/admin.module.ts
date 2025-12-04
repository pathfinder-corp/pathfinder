import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AssessmentResponse } from '../assessments/entities/assessment-response.entity'
import { AssessmentResult } from '../assessments/entities/assessment-result.entity'
import { AssessmentShare } from '../assessments/entities/assessment-share.entity'
import { Assessment } from '../assessments/entities/assessment.entity'
import { RoadmapShare } from '../roadmaps/entities/roadmap-share.entity'
import { Roadmap } from '../roadmaps/entities/roadmap.entity'
import { User } from '../users/entities/user.entity'
import { AdminAssessmentsController } from './controllers/admin-assessments.controller'
import { AdminDashboardController } from './controllers/admin-dashboard.controller'
import { AdminRoadmapsController } from './controllers/admin-roadmaps.controller'
import { AdminUsersController } from './controllers/admin-users.controller'
import { AdminAssessmentsService } from './services/admin-assessments.service'
import { AdminRoadmapsService } from './services/admin-roadmaps.service'
import { AdminStatsService } from './services/admin-stats.service'
import { AdminUsersService } from './services/admin-users.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Roadmap,
      RoadmapShare,
      Assessment,
      AssessmentShare,
      AssessmentResponse,
      AssessmentResult
    ])
  ],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminRoadmapsController,
    AdminAssessmentsController
  ],
  providers: [
    AdminStatsService,
    AdminUsersService,
    AdminRoadmapsService,
    AdminAssessmentsService
  ]
})
export class AdminModule {}

