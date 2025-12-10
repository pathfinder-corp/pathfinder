import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'
import { IsEnum, IsOptional, IsString } from 'class-validator'

import { UserRole, UserStatus } from '../../users/entities/user.entity'
import { PaginationQueryDto } from './pagination.dto'

export class AdminUserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus

  @ApiPropertyOptional({ description: 'Search by email or name' })
  @IsOptional()
  @IsString()
  search?: string
}

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus
}

export class AdminUserResponseDto {
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

  @ApiProperty({ enum: UserRole })
  @Expose()
  role: UserRole

  @ApiProperty({ enum: UserStatus })
  @Expose()
  status: UserStatus

  @ApiPropertyOptional()
  @Expose()
  avatar?: string

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  updatedAt: Date

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  lastLoginAt?: Date
}

export class AdminUserDetailResponseDto extends AdminUserResponseDto {
  @ApiProperty()
  @Expose()
  roadmapCount: number

  @ApiProperty()
  @Expose()
  assessmentCount: number
}

