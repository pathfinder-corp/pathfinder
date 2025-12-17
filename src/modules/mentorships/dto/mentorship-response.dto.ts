import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { MentorshipStatus } from '../entities/mentorship.entity'

export class MentorshipUserDto {
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

  @ApiPropertyOptional()
  @Expose()
  email?: string
}

export class MentorshipResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  mentorId: string

  @ApiPropertyOptional({ type: MentorshipUserDto })
  @Expose()
  @Type(() => MentorshipUserDto)
  mentor?: MentorshipUserDto

  @ApiProperty()
  @Expose()
  studentId: string

  @ApiPropertyOptional({ type: MentorshipUserDto })
  @Expose()
  @Type(() => MentorshipUserDto)
  student?: MentorshipUserDto

  @ApiProperty({ enum: MentorshipStatus })
  @Expose()
  status: MentorshipStatus

  @ApiPropertyOptional()
  @Expose()
  endReason?: string

  @ApiPropertyOptional()
  @Expose()
  endedBy?: string

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  startedAt: Date

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  endedAt?: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date
}

export class MentorshipListResponseDto {
  @ApiProperty({ type: [MentorshipResponseDto] })
  @Type(() => MentorshipResponseDto)
  mentorships: MentorshipResponseDto[]

  @ApiProperty()
  total: number
}
