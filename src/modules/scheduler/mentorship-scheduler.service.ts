import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { MentorshipRequestsService } from '../mentorship-requests/mentorship-requests.service'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class MentorshipSchedulerService {
  private readonly logger = new Logger(MentorshipSchedulerService.name)

  constructor(
    private readonly requestsService: MentorshipRequestsService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService
  ) {}
}
