import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUUID
} from 'class-validator'

export class ShareRoadmapDto {
  @ApiPropertyOptional({ description: 'Share the roadmap with all registered users' })
  @IsOptional()
  @IsBoolean()
  shareWithAll?: boolean

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs of registered users to share the roadmap with'
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item) => String(item)) : value
  )
  @IsUUID('4', { each: true })
  userIds?: string[]
}

export class RoadmapShareStateDto {
  @ApiProperty({ description: 'Indicates whether the roadmap is shared with all users' })
  isSharedWithAll!: boolean

  @ApiProperty({
    type: [String],
    description: 'IDs of users who have explicit access to the shared roadmap'
  })
  sharedWithUserIds!: string[]
}

