import { ApiProperty } from '@nestjs/swagger'
import { UserResponseDto } from '../../users/dto/user-response.dto'

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string

  @ApiProperty()
  tokenType: string

  @ApiProperty()
  expiresIn: string

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto
}