import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MentorApplication } from '../mentor-applications/entities/mentor-application.entity'
import { MentorshipRequest } from '../mentorship-requests/entities/mentorship-request.entity'
import { Mentorship } from '../mentorships/entities/mentorship.entity'
import { NotificationsModule } from '../notifications/notifications.module'
import { Message } from './entities/message.entity'
import { ParticipantGuard } from './guards/participant.guard'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'
import { ProfanityFilterService } from './services/profanity-filter.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      MentorApplication,
      MentorshipRequest,
      Mentorship
    ]),
    NotificationsModule
  ],
  controllers: [MessagesController],
  providers: [MessagesService, ProfanityFilterService, ParticipantGuard],
  exports: [MessagesService]
})
export class MessagesModule {}
