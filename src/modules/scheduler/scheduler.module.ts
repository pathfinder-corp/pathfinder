import { Module } from '@nestjs/common'

import { MentorshipRequestsModule } from '../mentorship-requests/mentorship-requests.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { MentorshipSchedulerService } from './mentorship-scheduler.service'

@Module({
  imports: [MentorshipRequestsModule, NotificationsModule],
  providers: [MentorshipSchedulerService],
  exports: [MentorshipSchedulerService]
})
export class SchedulerModule {}
