import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MentorProfile } from './entities/mentor-profile.entity'
import { MentorProfilesController } from './mentor-profiles.controller'
import { MentorProfilesService } from './mentor-profiles.service'

@Module({
  imports: [TypeOrmModule.forFeature([MentorProfile])],
  controllers: [MentorProfilesController],
  providers: [MentorProfilesService],
  exports: [MentorProfilesService]
})
export class MentorProfilesModule {}
