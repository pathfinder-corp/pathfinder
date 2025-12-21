import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from 'class-validator'

import { DocumentVerificationStatus } from '../../mentor-applications/entities/application-document.entity'
import { ApplicationStatus } from '../../mentor-applications/entities/application-status.enum'

export class AdminListMentorsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ description: 'Filter by accepting mentees status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isAcceptingMentees?: boolean

  @ApiPropertyOptional({ description: 'Search by name, headline, bio' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20)
  }

  get take(): number {
    return this.limit ?? 20
  }
}

export class AdminListMentorshipsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by mentor ID' })
  @IsOptional()
  @IsUUID()
  mentorId?: string

  @ApiPropertyOptional({ description: 'Filter by mentee ID' })
  @IsOptional()
  @IsUUID()
  menteeId?: string

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['pending', 'active', 'completed', 'cancelled']
  })
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20)
  }

  get take(): number {
    return this.limit ?? 20
  }
}

export class AdminListApplicationsQueryDto {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20)
  }

  get take(): number {
    return this.limit ?? 20
  }
}

export class AdminRevokeMentorDto {
  @ApiProperty({
    description: 'Reason for revoking mentor status',
    maxLength: 1000
  })
  @IsString()
  @MaxLength(1000)
  reason: string
}

export class AdminForceEndMentorshipDto {
  @ApiProperty({
    description: 'Reason for force ending the mentorship',
    maxLength: 1000
  })
  @IsString()
  @MaxLength(1000)
  reason: string
}

export class AdminListAuditLogsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorId?: string

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 50)
  }

  get take(): number {
    return this.limit ?? 50
  }
}

export class AdminListDocumentsQueryDto {
  @ApiPropertyOptional({
    enum: DocumentVerificationStatus,
    description: 'Filter by verification status (pending, verified, rejected)'
  })
  @IsOptional()
  @IsEnum(DocumentVerificationStatus)
  status?: DocumentVerificationStatus

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 50)
  }

  get take(): number {
    return this.limit ?? 50
  }
}
