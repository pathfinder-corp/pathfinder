import { ApiPropertyOptional } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator'

export class ShareAssessmentDto {
  @ApiPropertyOptional({
    description: 'Whether to share the assessment with all users publicly',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  shareWithAll?: boolean

  @ApiPropertyOptional({
    description: 'Array of user IDs to share the assessment with',
    type: [String],
    example: ['b8f82d24-5f0d-4b66-9df2-4388f080d2bf']
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[]
}

@Exclude()
export class AssessmentShareStateDto {
  @Expose()
  @ApiPropertyOptional({
    description: 'Whether the assessment is shared publicly',
    example: false
  })
  isSharedWithAll!: boolean

  @Expose()
  @ApiPropertyOptional({
    description: 'Array of user IDs the assessment is shared with',
    type: [String],
    example: []
  })
  sharedWithUserIds!: string[]
}


