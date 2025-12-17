import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class CreateMentorshipRequestDto {
  @ApiProperty({ description: 'Mentor user ID' })
  @IsUUID()
  mentorId: string

  @ApiPropertyOptional({
    description: 'Message to the mentor',
    maxLength: 1000
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string
}
