import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

import { ApplicationStatus } from '../entities/mentor-application.entity'

export class ApplicationDataDto {
  @ApiPropertyOptional()
  @Expose()
  headline?: string

  @ApiPropertyOptional()
  @Expose()
  bio?: string

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  expertise?: string[]

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  skills?: string[]

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  industries?: string[]

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  languages?: string[]

  @ApiPropertyOptional()
  @Expose()
  yearsExperience?: number

  @ApiPropertyOptional()
  @Expose()
  linkedinUrl?: string

  @ApiPropertyOptional()
  @Expose()
  portfolioUrl?: string

  @ApiPropertyOptional()
  @Expose()
  motivation?: string
}

export class ApplicationUserDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  email: string

  @ApiProperty()
  @Expose()
  firstName: string

  @ApiProperty()
  @Expose()
  lastName: string
}

export class StatusHistoryDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiPropertyOptional({ enum: ApplicationStatus })
  @Expose()
  previousStatus?: ApplicationStatus

  @ApiProperty({ enum: ApplicationStatus })
  @Expose()
  newStatus: ApplicationStatus

  @ApiPropertyOptional()
  @Expose()
  reason?: string

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date
}

export class ApplicationResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  userId: string

  @ApiPropertyOptional({ type: ApplicationUserDto })
  @Expose()
  @Type(() => ApplicationUserDto)
  user?: ApplicationUserDto

  @ApiProperty({ enum: ApplicationStatus })
  @Expose()
  status: ApplicationStatus

  @ApiProperty({ type: ApplicationDataDto })
  @Expose()
  @Type(() => ApplicationDataDto)
  applicationData: ApplicationDataDto

  @ApiPropertyOptional({
    description: 'Only visible to the applicant if declined'
  })
  @Expose()
  declineReason?: string

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  decidedAt?: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date
}

export class AdminApplicationResponseDto extends ApplicationResponseDto {
  @ApiPropertyOptional({ description: 'Admin-only internal notes' })
  @Expose()
  adminNotes?: string

  @ApiPropertyOptional()
  @Expose()
  reviewedBy?: string

  @ApiPropertyOptional({ type: ApplicationUserDto })
  @Expose()
  @Type(() => ApplicationUserDto)
  reviewer?: ApplicationUserDto

  @ApiPropertyOptional({ type: [StatusHistoryDto] })
  @Expose()
  @Type(() => StatusHistoryDto)
  statusHistory?: StatusHistoryDto[]

  @ApiPropertyOptional({
    description: 'Whether application is flagged for review'
  })
  @Expose()
  isFlagged?: boolean

  @ApiPropertyOptional({ description: 'Content validation flags' })
  @Expose()
  contentFlags?: object

  @ApiPropertyOptional({ description: 'Hashed IP address' })
  @Expose()
  ipHash?: string
}
