import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MentorProfilesModule } from '../mentor-profiles/mentor-profiles.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { MentorshipRequest } from './entities/mentorship-request.entity'
import { MentorshipRequestsController } from './mentorship-requests.controller'
import { MentorshipRequestsService } from './mentorship-requests.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([MentorshipRequest]),
    MentorProfilesModule,
    NotificationsModule
  ],
  controllers: [MentorshipRequestsController],
  providers: [MentorshipRequestsService],
  exports: [MentorshipRequestsService]
})
export class MentorshipRequestsModule {}
