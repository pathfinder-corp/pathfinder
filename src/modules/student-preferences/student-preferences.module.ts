import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { StudentPreference } from './entities/student-preference.entity'
import { StudentPreferencesController } from './student-preferences.controller'
import { StudentPreferencesService } from './student-preferences.service'

@Module({
  imports: [TypeOrmModule.forFeature([StudentPreference])],
  controllers: [StudentPreferencesController],
  providers: [StudentPreferencesService],
  exports: [StudentPreferencesService]
})
export class StudentPreferencesModule {}
