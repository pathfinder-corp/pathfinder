import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'

import { RequestStatus } from '../entities/mentorship-request.entity'

export class ListRequestsQueryDto {
  @ApiPropertyOptional({ enum: RequestStatus })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus

  @ApiPropertyOptional({
    description: 'Filter by role: as_student or as_mentor',
    enum: ['as_student', 'as_mentor']
  })
  @IsOptional()
  role?: 'as_student' | 'as_mentor'

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
