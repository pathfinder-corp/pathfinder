import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class EndMentorshipDto {
  @ApiProperty({
    description: 'Reason for ending the mentorship',
    minLength: 10,
    maxLength: 1000
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string
}
