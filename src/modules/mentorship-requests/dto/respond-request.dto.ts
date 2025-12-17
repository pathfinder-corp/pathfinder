import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class AcceptRequestDto {
  @ApiPropertyOptional({
    description: 'Optional message to the student',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string
}

export class DeclineRequestDto {
  @ApiProperty({
    description: 'Reason for declining (visible to student)',
    maxLength: 500
  })
  @IsString()
  @MaxLength(500)
  reason: string
}
