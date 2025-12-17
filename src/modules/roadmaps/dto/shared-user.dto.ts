import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SharedUserDto {
  @ApiProperty({
    example: 'b8f82d24-5f0d-4b66-9df2-4388f080d2bf',
    description: 'Unique identifier of the user'
  })
  id!: string

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the user'
  })
  email!: string

  @ApiProperty({
    example: 'John',
    description: 'First name of the user'
  })
  firstName!: string

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the user'
  })
  lastName!: string

  @ApiPropertyOptional({
    example: 'https://example.com/avatars/user.jpg',
    description: 'Avatar URL of the user'
  })
  avatar?: string

  @ApiProperty({
    example: '2025-01-15T10:30:00.000Z',
    description: 'Timestamp when the roadmap was shared with this user'
  })
  sharedAt!: string
}
