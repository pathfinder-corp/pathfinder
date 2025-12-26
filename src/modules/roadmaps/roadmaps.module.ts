import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { User } from '../users/entities/user.entity'
import { RoadmapShare } from './entities/roadmap-share.entity'
import { Roadmap } from './entities/roadmap.entity'
import { RoadmapContentPolicyService } from './roadmap-content-policy.service'
import { RoadmapsController } from './roadmaps.controller'
import { RoadmapsService } from './roadmaps.service'
import { RoadmapsMapService } from './services/roadmaps.map.service'
import { RoadmapsReduceService } from './services/roadmaps.reduce.service'

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Roadmap, RoadmapShare, User])
  ],
  controllers: [RoadmapsController],
  providers: [
    RoadmapsService,
    RoadmapContentPolicyService,
    RoadmapsMapService,
    RoadmapsReduceService
  ]
})
export class RoadmapsModule {}
