import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'
import { EnrollmentStatus } from '../entities/enrollment.entity'
import { CourseResponseDto } from './course-response.dto'

@Exclude()
export class EnrollmentResponseDto {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty()
  userId: string

  @Expose()
  @ApiProperty()
  courseId: string

  @Expose()
  @ApiProperty({ type: () => CourseResponseDto })
  @Type(() => CourseResponseDto)
  course?: CourseResponseDto

  @Expose()
  @ApiProperty({ enum: EnrollmentStatus })
  status: EnrollmentStatus

  @Expose()
  @ApiProperty()
  progress: number

  @Expose()
  @ApiPropertyOptional()
  grade?: string

  @Expose()
  @ApiProperty()
  enrolledAt: Date

  @Expose()
  @ApiPropertyOptional()
  completedAt?: Date

  @Expose()
  @ApiProperty()
  createdAt: Date

  @Expose()
  @ApiProperty()
  updatedAt: Date
}

