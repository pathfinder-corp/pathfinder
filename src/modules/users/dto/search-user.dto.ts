import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class SearchUserDto {
  @ApiProperty({
    description: 'Email address to search for',
    example: 'user@example.com'
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email!: string
}

@Exclude()
export class UserSearchResultDto {
  @Expose()
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id!: string

  @Expose()
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com'
  })
  email!: string

  @Expose()
  @ApiProperty({
    description: 'User first name',
    example: 'John'
  })
  firstName!: string

  @Expose()
  @ApiProperty({
    description: 'User last name',
    example: 'Doe'
  })
  lastName!: string
}

