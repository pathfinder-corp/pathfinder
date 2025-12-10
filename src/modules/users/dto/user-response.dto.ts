import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'

import { UserRole, UserStatus } from '../entities/user.entity'

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty()
  id: string

  @Expose()
  @ApiProperty()
  email: string

  @Expose()
  @ApiProperty()
  firstName: string

  @Expose()
  @ApiProperty()
  lastName: string

  @Expose()
  @ApiProperty({ enum: UserRole })
  role: UserRole

  @Expose()
  @ApiProperty({ enum: UserStatus })
  status: UserStatus

  @Expose()
  @ApiProperty({ required: false })
  avatar?: string

  @Expose()
  @ApiProperty()
  createdAt: Date

  @Expose()
  @ApiProperty()
  updatedAt: Date
}
