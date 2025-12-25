import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuditLog } from '../../common/entities/audit-log.entity'
import { GenAIApiUsage } from '../../common/entities/genai-api-usage.entity'
import { AssessmentResponse } from '../assessments/entities/assessment-response.entity'
import { AssessmentResult } from '../assessments/entities/assessment-result.entity'
import { Assessment } from '../assessments/entities/assessment.entity'
import { ContactMessage } from '../contact/entities/contact-message.entity'
import { MailModule } from '../mail/mail.module'
import { MentorApplicationsModule } from '../mentor-applications/mentor-applications.module'
import { MentorProfilesModule } from '../mentor-profiles/mentor-profiles.module'
import { MentorshipsModule } from '../mentorships/mentorships.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { RoadmapShare } from '../roadmaps/entities/roadmap-share.entity'
import { Roadmap } from '../roadmaps/entities/roadmap.entity'
import { User } from '../users/entities/user.entity'
import { UsersModule } from '../users/users.module'
import { AdminAssessmentsController } from './controllers/admin-assessments.controller'
import { AdminContactController } from './controllers/admin-contact.controller'
import { AdminDashboardController } from './controllers/admin-dashboard.controller'
import { AdminMentorshipController } from './controllers/admin-mentorship.controller'
import { AdminRoadmapsController } from './controllers/admin-roadmaps.controller'
import { AdminUsersController } from './controllers/admin-users.controller'
import { GenAIUsageController } from './controllers/genai-usage.controller'
import { AdminAssessmentsService } from './services/admin-assessments.service'
import { AdminContactService } from './services/admin-contact.service'
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
      AuditLog,
      ContactMessage,
      GenAIApiUsage
    ]),
    UsersModule,
    MailModule,
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
    AdminMentorshipController,
    AdminContactController,
    GenAIUsageController
  ],
  providers: [
    AdminStatsService,
    AdminUsersService,
    AdminRoadmapsService,
    AdminAssessmentsService,
    AdminContactService
  ]
})
export class AdminModule {}
