import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ApplicationDocument } from '../mentor-applications/entities/application-document.entity'
import { MentorApplication } from '../mentor-applications/entities/mentor-application.entity'
import { MentorApplicationsModule } from '../mentor-applications/mentor-applications.module'
import { Mentorship } from '../mentorships/entities/mentorship.entity'
import { UsersModule } from '../users/users.module'
import { MentorProfile } from './entities/mentor-profile.entity'
import { MentorProfilesController } from './mentor-profiles.controller'
import { MentorProfilesService } from './mentor-profiles.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MentorProfile,
      MentorApplication,
      ApplicationDocument,
      Mentorship
    ]),
    UsersModule,
    forwardRef(() => MentorApplicationsModule)
  ],
  controllers: [MentorProfilesController],
  providers: [MentorProfilesService],
  exports: [MentorProfilesService]
})
export class MentorProfilesModule {}
