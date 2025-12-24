import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuditLog } from '../../common/entities/audit-log.entity'
import { AssessmentResponse } from '../assessments/entities/assessment-response.entity'
import { AssessmentResult } from '../assessments/entities/assessment-result.entity'
import { Assessment } from '../assessments/entities/assessment.entity'
import { MentorApplicationsModule } from '../mentor-applications/mentor-applications.module'
import { MentorProfilesModule } from '../mentor-profiles/mentor-profiles.module'
import { MentorshipsModule } from '../mentorships/mentorships.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { RoadmapShare } from '../roadmaps/entities/roadmap-share.entity'
import { Roadmap } from '../roadmaps/entities/roadmap.entity'
import { User } from '../users/entities/user.entity'
import { UsersModule } from '../users/users.module'
import { AdminAssessmentsController } from './controllers/admin-assessments.controller'
import { AdminDashboardController } from './controllers/admin-dashboard.controller'
import { AdminMentorshipController } from './controllers/admin-mentorship.controller'
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
      AssessmentResponse,
      AssessmentResult,
      AuditLog
    ]),
    UsersModule,
    MentorApplicationsModule,
    MentorProfilesModule,
    MentorshipsModule,
    NotificationsModule
  ],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminRoadmapsController,
    AdminAssessmentsController,
    AdminMentorshipController
  ],
  providers: [
    AdminStatsService,
    AdminUsersService,
    AdminRoadmapsService,
    AdminAssessmentsService
  ]
})
export class AdminModule {}
