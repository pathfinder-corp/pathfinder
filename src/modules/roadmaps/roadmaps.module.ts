import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { RoadmapsController } from './roadmaps.controller'
import { RoadmapsService } from './roadmaps.service'

@Module({
  imports: [ConfigModule],
  controllers: [RoadmapsController],
  providers: [RoadmapsService]
})
export class RoadmapsModule {}
