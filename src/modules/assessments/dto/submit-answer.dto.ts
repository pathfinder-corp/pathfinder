import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min
} from 'class-validator'

export class SubmitAnswerDto {
  @ApiProperty({
    description: 'The UUID of the question being answered',
    example: 'b8f82d24-5f0d-4b66-9df2-4388f080d2bf'
  })
  @IsUUID()
  @IsNotEmpty()
  questionId!: string

  @ApiProperty({
    description: 'The index of the selected answer (0-3)',
    minimum: 0,
    maximum: 3,
    example: 2
  })
  @IsInt()
  @Min(0)
  @Max(3)
  selectedAnswerIndex!: number

  @ApiPropertyOptional({
    description: 'Time spent on the question in seconds',
    minimum: 0,
    example: 45
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpent?: number
}
