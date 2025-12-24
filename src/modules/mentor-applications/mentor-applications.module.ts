import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MentorProfilesModule } from '../mentor-profiles/mentor-profiles.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { RoadmapContentPolicyService } from '../roadmaps/roadmap-content-policy.service'
import { UsersModule } from '../users/users.module'
import { ApplicationDocument } from './entities/application-document.entity'
import { ApplicationStatusHistory } from './entities/application-status-history.entity'
import { MentorApplication } from './entities/mentor-application.entity'
import { MentorApplicationsController } from './mentor-applications.controller'
import { MentorApplicationsService } from './mentor-applications.service'
import { ContentValidatorService } from './services/content-validator.service'
import { DocumentUploadService } from './services/document-upload.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MentorApplication,
      ApplicationStatusHistory,
      ApplicationDocument
    ]),
    UsersModule,
    NotificationsModule,
    forwardRef(() => MentorProfilesModule)
  ],
  controllers: [MentorApplicationsController],
  providers: [
    MentorApplicationsService,
    ContentValidatorService,
    DocumentUploadService,
    RoadmapContentPolicyService
  ],
  exports: [MentorApplicationsService, DocumentUploadService]
})
export class MentorApplicationsModule {}
