import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { CourseCategory, CourseLevel } from '../entities/course.entity'

@Exclude()
export class CourseResponseDto {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty()
  name: string

  @Expose()
  @ApiProperty()
  description: string

  @Expose()
  @ApiProperty({ enum: CourseCategory })
  category: CourseCategory

  @Expose()
  @ApiProperty({ enum: CourseLevel })
  level: CourseLevel

  @Expose()
  @ApiProperty()
  credits: number

  @Expose()
  @ApiProperty({ type: [String] })
  prerequisites: string[]

  @Expose()
  @ApiProperty({ type: [String] })
  skills: string[]

  @Expose()
  @ApiPropertyOptional()
  durationHours?: number

  @Expose()
  @ApiPropertyOptional()
  provider?: string

  @Expose()
  @ApiPropertyOptional()
  rating?: number

  @Expose()
  @ApiPropertyOptional()
  thumbnail?: string

  @Expose()
  @ApiProperty()
  isActive: boolean

  @Expose()
  @ApiProperty()
  createdAt: Date

  @Expose()
  @ApiProperty()
  updatedAt: Date
}

