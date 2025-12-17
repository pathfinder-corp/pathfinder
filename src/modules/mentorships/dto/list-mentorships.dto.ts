import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'

import { MentorshipStatus } from '../entities/mentorship.entity'

export class ListMentorshipsQueryDto {
  @ApiPropertyOptional({ enum: MentorshipStatus })
  @IsOptional()
  @IsEnum(MentorshipStatus)
  status?: MentorshipStatus

  @ApiPropertyOptional({
    description: 'Filter by role in mentorship',
    enum: ['as_mentor', 'as_student']
  })
  @IsOptional()
  role?: 'as_mentor' | 'as_student'

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
