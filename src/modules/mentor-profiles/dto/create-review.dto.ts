import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from 'class-validator'

export class CreateMentorReviewDto {
  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 5
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  rating: number

  @ApiPropertyOptional({
    description: 'Feedback text',
    maxLength: 2000
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string

  @ApiPropertyOptional({
    description: 'Mentorship ID if review is from an active mentorship'
  })
  @IsOptional()
  @IsUUID()
  mentorshipId?: string
}

