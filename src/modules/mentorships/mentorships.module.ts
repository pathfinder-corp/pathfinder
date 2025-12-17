import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { NotificationsModule } from '../notifications/notifications.module'
import { Mentorship } from './entities/mentorship.entity'
import { MentorshipsController } from './mentorships.controller'
import { MentorshipsService } from './mentorships.service'

@Module({
  imports: [TypeOrmModule.forFeature([Mentorship]), NotificationsModule],
  controllers: [MentorshipsController],
  providers: [MentorshipsService],
  exports: [MentorshipsService]
})
export class MentorshipsModule {}
