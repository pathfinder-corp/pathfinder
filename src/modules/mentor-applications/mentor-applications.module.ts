import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MentorProfilesModule } from '../mentor-profiles/mentor-profiles.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { UsersModule } from '../users/users.module'
import { ApplicationStatusHistory } from './entities/application-status-history.entity'
import { MentorApplication } from './entities/mentor-application.entity'
import { MentorApplicationsController } from './mentor-applications.controller'
import { MentorApplicationsService } from './mentor-applications.service'
import { ContentValidatorService } from './services/content-validator.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([MentorApplication, ApplicationStatusHistory]),
    UsersModule,
    NotificationsModule,
    MentorProfilesModule
  ],
  controllers: [MentorApplicationsController],
  providers: [MentorApplicationsService, ContentValidatorService],
  exports: [MentorApplicationsService]
})
export class MentorApplicationsModule {}
