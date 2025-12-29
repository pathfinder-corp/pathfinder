import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { RolesGuard } from '../auth/guards/roles.guard'
import {
  UserBadge,
  UserGamification
} from './entities/user-gamification.entity'
import { User } from './entities/user.entity'
import { UserGamificationService } from './services/user-gamification.service'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, UserGamification, UserBadge])],
  controllers: [UsersController],
  providers: [UsersService, UserGamificationService, RolesGuard],
  exports: [UsersService, UserGamificationService]
})
export class UsersModule {}
