import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ChatModule } from '../chat/chat.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { Mentorship } from './entities/mentorship.entity'
import { MentorshipsController } from './mentorships.controller'
import { MentorshipsService } from './mentorships.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Mentorship]),
    NotificationsModule,
    forwardRef(() => ChatModule)
  ],
  controllers: [MentorshipsController],
  providers: [MentorshipsService],
  exports: [MentorshipsService]
})
export class MentorshipsModule {}
