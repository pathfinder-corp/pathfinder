import { ApiProperty } from '@nestjs/swagger'

export class OverviewStatsDto {
  @ApiProperty()
  totalUsers: number

  @ApiProperty()
  totalRoadmaps: number

  @ApiProperty()
  totalAssessments: number

  @ApiProperty()
  newUsersLast7Days: number

  @ApiProperty()
  newRoadmapsLast7Days: number

  @ApiProperty()
  newAssessmentsLast7Days: number
}

export class UsersByRoleDto {
  @ApiProperty()
  role: string

  @ApiProperty()
  count: number
}

export class UsersByStatusDto {
  @ApiProperty()
  status: string

  @ApiProperty()
  count: number
}

export class RegistrationTrendDto {
  @ApiProperty()
  date: string

  @ApiProperty()
  count: number
}

export class UserStatsDto {
  @ApiProperty({ type: [UsersByRoleDto] })
  byRole: UsersByRoleDto[]

  @ApiProperty({ type: [UsersByStatusDto] })
  byStatus: UsersByStatusDto[]

  @ApiProperty({ type: [RegistrationTrendDto] })
  registrationTrend: RegistrationTrendDto[]
}

export class TopicCountDto {
  @ApiProperty()
  topic: string

  @ApiProperty()
  count: number
}

export class RoadmapTrendDto {
  @ApiProperty()
  date: string

  @ApiProperty()
  count: number
}

export class RoadmapStatsDto {
  @ApiProperty()
  total: number

  @ApiProperty()
  sharedCount: number

  @ApiProperty({ type: [TopicCountDto] })
  popularTopics: TopicCountDto[]

  @ApiProperty({ type: [RoadmapTrendDto] })
  generationTrend: RoadmapTrendDto[]
}

export class DomainCountDto {
  @ApiProperty()
  domain: string

  @ApiProperty()
  count: number
}

export class AssessmentsByStatusDto {
  @ApiProperty()
  status: string

  @ApiProperty()
  count: number
}

export class AssessmentsByDifficultyDto {
  @ApiProperty()
  difficulty: string

  @ApiProperty()
  count: number
}

export class AssessmentTrendDto {
  @ApiProperty()
  date: string

  @ApiProperty()
  count: number
}

export class AssessmentStatsDto {
  @ApiProperty()
  total: number

  @ApiProperty({ type: [AssessmentsByStatusDto] })
  byStatus: AssessmentsByStatusDto[]

  @ApiProperty({ type: [AssessmentsByDifficultyDto] })
  byDifficulty: AssessmentsByDifficultyDto[]

  @ApiProperty({ type: [DomainCountDto] })
  popularDomains: DomainCountDto[]

  @ApiProperty({ type: [AssessmentTrendDto] })
  creationTrend: AssessmentTrendDto[]
}
