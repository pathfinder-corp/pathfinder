import { Module } from '@nestjs/common'

import { MentorProfilesModule } from '../mentor-profiles/mentor-profiles.module'
import { StudentPreferencesModule } from '../student-preferences/student-preferences.module'
import { RecommendationsController } from './recommendations.controller'
import { RecommendationsService } from './recommendations.service'
import { GeminiScoringStrategy } from './strategies/gemini-scoring.strategy'
import { RuleBasedScoringStrategy } from './strategies/rule-based-scoring.strategy'

@Module({
  imports: [MentorProfilesModule, StudentPreferencesModule],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    RuleBasedScoringStrategy,
    GeminiScoringStrategy
  ],
  exports: [RecommendationsService]
})
export class RecommendationsModule {}
