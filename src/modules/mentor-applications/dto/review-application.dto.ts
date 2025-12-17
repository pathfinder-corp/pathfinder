import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export enum ReviewDecision {
  APPROVE = 'approve',
  DECLINE = 'decline'
}

export class ReviewApplicationDto {
  @ApiProperty({
    enum: ReviewDecision,
    description: 'Decision to approve or decline the application'
  })
  @IsEnum(ReviewDecision)
  decision: ReviewDecision

  @ApiPropertyOptional({
    description: 'Reason for decline (required if declining)',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  declineReason?: string

  @ApiPropertyOptional({
    description: 'Internal admin notes (not visible to applicant)',
    maxLength: 2000
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string
}
