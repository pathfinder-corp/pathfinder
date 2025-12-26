import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

export class ReviewStudentDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  firstName: string

  @ApiProperty()
  @Expose()
  lastName: string

  @ApiPropertyOptional()
  @Expose()
  avatar?: string
}

export class MentorReviewResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  mentorId: string

  @ApiProperty()
  @Expose()
  studentId: string

  @ApiPropertyOptional({ type: ReviewStudentDto })
  @Expose()
  @Type(() => ReviewStudentDto)
  student?: ReviewStudentDto

  @ApiPropertyOptional()
  @Expose()
  mentorshipId?: string

  @ApiProperty({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  @Expose()
  rating: number

  @ApiPropertyOptional()
  @Expose()
  feedback?: string

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date
}

export class MentorReviewStatsDto {
  @ApiProperty({ description: 'Average rating (0-5)' })
  @Expose()
  averageRating: number

  @ApiProperty({ description: 'Total number of reviews' })
  @Expose()
  totalReviews: number

  @ApiProperty({
    description: 'Rating distribution',
    example: { 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 }
  })
  @Expose()
  ratingDistribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}
