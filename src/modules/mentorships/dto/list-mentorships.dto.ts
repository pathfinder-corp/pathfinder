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

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  offset?: number = 0
}
