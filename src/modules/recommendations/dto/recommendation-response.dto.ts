import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { MentorProfileResponseDto } from '../../mentor-profiles/dto/mentor-profile-response.dto'

export class ScoreBreakdownDto {
  @ApiProperty({ description: 'Skills matching score (0-30)' })
  @Expose()
  skillsMatch: number

  @ApiProperty({ description: 'Expertise/domain matching score (0-30)' })
  @Expose()
  expertiseMatch: number

  @ApiProperty({ description: 'Language matching score (0-20)' })
  @Expose()
  languageMatch: number

  @ApiProperty({ description: 'Experience matching score (0-20)' })
  @Expose()
  experienceMatch: number
}

export class RecommendedMentorDto {
  @ApiProperty({ description: 'Overall match score (0-100)' })
  @Expose()
  score: number

  @ApiProperty({ type: ScoreBreakdownDto })
  @Expose()
  @Type(() => ScoreBreakdownDto)
  breakdown: ScoreBreakdownDto

  @ApiProperty({
    type: [String],
    description: 'Human-readable reasons for the match'
  })
  @Expose()
  reasons: string[]

  @ApiProperty({ type: MentorProfileResponseDto })
  @Expose()
  @Type(() => MentorProfileResponseDto)
  mentor: MentorProfileResponseDto
}

export class RecommendationsResponseDto {
  @ApiProperty({ type: [RecommendedMentorDto] })
  @Type(() => RecommendedMentorDto)
  recommendations: RecommendedMentorDto[]

  @ApiProperty({ description: 'Total number of available mentors considered' })
  total: number

  @ApiPropertyOptional({ description: 'Scoring strategy used' })
  strategy?: string
}
