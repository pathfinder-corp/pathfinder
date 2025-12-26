import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ApplicationDocument } from '../mentor-applications/entities/application-document.entity'
import { MentorApplication } from '../mentor-applications/entities/mentor-application.entity'
import { MentorApplicationsModule } from '../mentor-applications/mentor-applications.module'
import { Mentorship } from '../mentorships/entities/mentorship.entity'
import { User } from '../users/entities/user.entity'
import { UsersModule } from '../users/users.module'
import { MentorReviewsController } from './controllers/mentor-reviews.controller'
import { MentorProfile } from './entities/mentor-profile.entity'
import { MentorReview } from './entities/mentor-review.entity'
import { MentorProfilesController } from './mentor-profiles.controller'
import { MentorProfilesService } from './mentor-profiles.service'
import { MentorReviewsService } from './services/mentor-reviews.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MentorProfile,
      MentorApplication,
      ApplicationDocument,
      Mentorship,
      MentorReview,
      User
    ]),
    UsersModule,
    forwardRef(() => MentorApplicationsModule)
  ],
  controllers: [MentorProfilesController, MentorReviewsController],
  providers: [MentorProfilesService, MentorReviewsService],
  exports: [MentorProfilesService, MentorReviewsService]
})
export class MentorProfilesModule {}
