import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

export class MentorUserDto {
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

export class MentorProfileResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  userId: string

  @ApiPropertyOptional({ type: MentorUserDto })
  @Expose()
  @Type(() => MentorUserDto)
  user?: MentorUserDto

  @ApiPropertyOptional()
  @Expose()
  headline?: string

  @ApiPropertyOptional()
  @Expose()
  bio?: string

  @ApiProperty({ type: [String] })
  @Expose()
  expertise: string[]

  @ApiProperty({ type: [String] })
  @Expose()
  skills: string[]

  @ApiProperty({ type: [String] })
  @Expose()
  industries: string[]

  @ApiProperty({ type: [String] })
  @Expose()
  languages: string[]

  @ApiPropertyOptional()
  @Expose()
  yearsExperience?: number

  @ApiPropertyOptional()
  @Expose()
  linkedinUrl?: string

  @ApiPropertyOptional()
  @Expose()
  portfolioUrl?: string

  @ApiProperty()
  @Expose()
  isActive: boolean

  @ApiProperty()
  @Expose()
  isAcceptingMentees: boolean

  @ApiPropertyOptional()
  @Expose()
  maxMentees?: number

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date
}

export class MentorListResponseDto {
  @ApiProperty({ type: [MentorProfileResponseDto] })
  @Type(() => MentorProfileResponseDto)
  mentors: MentorProfileResponseDto[]

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5
    }
  })
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
