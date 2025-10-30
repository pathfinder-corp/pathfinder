import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { EducationLevel } from '../entities/academic-profile.entity'

@Exclude()
export class AcademicProfileResponseDto {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty()
  userId: string

  @Expose()
  @ApiProperty({ enum: EducationLevel })
  currentLevel: EducationLevel

  @Expose()
  @ApiPropertyOptional()
  currentGrade?: string

  @Expose()
  @ApiPropertyOptional()
  institution?: string

  @Expose()
  @ApiPropertyOptional()
  major?: string

  @Expose()
  @ApiPropertyOptional()
  minor?: string

  @Expose()
  @ApiPropertyOptional()
  gpa?: number

  @Expose()
  @ApiProperty({ type: [String] })
  achievements: string[]

  @Expose()
  @ApiProperty({ type: [String] })
  certifications: string[]

  @Expose()
  @ApiProperty({ type: [String] })
  academicInterests: string[]

  @Expose()
  @ApiProperty({ type: [String] })
  subjectStrengths: string[]

  @Expose()
  @ApiProperty({ type: [String] })
  subjectsNeedImprovement: string[]

  @Expose()
  @ApiPropertyOptional()
  intendedMajor?: string

  @Expose()
  @ApiPropertyOptional()
  targetUniversity?: string

  @Expose()
  @ApiProperty({ type: [String] })
  extracurricularActivities: string[]

  @Expose()
  @ApiProperty()
  createdAt: Date

  @Expose()
  @ApiProperty()
  updatedAt: Date
}