import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Roadmap } from './entities/roadmap.entity'
import { RoadmapShare } from './entities/roadmap-share.entity'
import { User } from '../users/entities/user.entity'
import { RoadmapContentPolicyService } from './roadmap-content-policy.service'
import { RoadmapsController } from './roadmaps.controller'
import { RoadmapsService } from './roadmaps.service'

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Roadmap, RoadmapShare, User])],
  controllers: [RoadmapsController],
  providers: [RoadmapsService, RoadmapContentPolicyService]
})
export class RoadmapsModule {}
