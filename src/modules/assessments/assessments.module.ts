import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { User } from '../users/entities/user.entity'
import { AssessmentContentPolicyService } from './assessment-content-policy.service'
import { AssessmentResultsService } from './assessment-results.service'
import { AssessmentSharingService } from './assessment-sharing.service'
import { AssessmentsController } from './assessments.controller'
import { AssessmentsService } from './assessments.service'
import { AssessmentQuestion } from './entities/assessment-question.entity'
import { AssessmentResponse } from './entities/assessment-response.entity'
import { AssessmentResult } from './entities/assessment-result.entity'
import { AssessmentShare } from './entities/assessment-share.entity'
import { Assessment } from './entities/assessment.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assessment,
      AssessmentQuestion,
      AssessmentResponse,
      AssessmentResult,
      AssessmentShare,
      User
    ])
  ],
  controllers: [AssessmentsController],
  providers: [
    AssessmentsService,
    AssessmentResultsService,
    AssessmentSharingService,
    AssessmentContentPolicyService
  ],
  exports: [
    AssessmentsService,
    AssessmentResultsService,
    AssessmentSharingService
  ]
})
export class AssessmentsModule {}
