import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { RequestStatus } from '../entities/mentorship-request.entity'

export class RequestUserDto {
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

export class MentorshipRequestResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  studentId: string

  @ApiPropertyOptional({ type: RequestUserDto })
  @Expose()
  @Type(() => RequestUserDto)
  student?: RequestUserDto

  @ApiProperty()
  @Expose()
  mentorId: string

  @ApiPropertyOptional({ type: RequestUserDto })
  @Expose()
  @Type(() => RequestUserDto)
  mentor?: RequestUserDto

  @ApiPropertyOptional()
  @Expose()
  message?: string

  @ApiProperty({ enum: RequestStatus })
  @Expose()
  status: RequestStatus

  @ApiPropertyOptional()
  @Expose()
  declineReason?: string

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  expiresAt: Date

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  respondedAt?: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date
}

export class RequestListResponseDto {
  @ApiProperty({ type: [MentorshipRequestResponseDto] })
  @Type(() => MentorshipRequestResponseDto)
  requests: MentorshipRequestResponseDto[]

  @ApiProperty()
  total: number
}
