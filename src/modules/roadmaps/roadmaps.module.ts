import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Roadmap } from './entities/roadmap.entity'
import { RoadmapsController } from './roadmaps.controller'
import { RoadmapsService } from './roadmaps.service'

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Roadmap])],
  controllers: [RoadmapsController],
  providers: [RoadmapsService]
})
export class RoadmapsModule {}
