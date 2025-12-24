import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator'

export class UpdateMentorReviewDto {
  @ApiPropertyOptional({
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number

  @ApiPropertyOptional({
    description: 'Feedback text',
    maxLength: 2000
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string
}

