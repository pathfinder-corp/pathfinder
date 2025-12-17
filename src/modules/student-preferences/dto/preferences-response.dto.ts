import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose, Type } from 'class-transformer'

export class PreferencesDataDto {
  @ApiPropertyOptional({ type: [String] })
  @Expose()
  domains?: string[]

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  goals?: string[]

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  skills?: string[]

  @ApiPropertyOptional()
  @Expose()
  language?: string

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  languages?: string[]

  @ApiPropertyOptional()
  @Expose()
  minYearsExperience?: number

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  industries?: string[]

  @ApiPropertyOptional()
  @Expose()
  additionalNotes?: string
}

export class PreferencesResponseDto {
  @ApiProperty()
  @Expose()
  id: string

  @ApiProperty()
  @Expose()
  userId: string

  @ApiProperty()
  @Expose()
  version: number

  @ApiProperty({ type: PreferencesDataDto })
  @Expose()
  @Type(() => PreferencesDataDto)
  preferences: PreferencesDataDto

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  createdAt: Date
}

export class PreferencesHistoryResponseDto {
  @ApiProperty({ type: [PreferencesResponseDto] })
  @Type(() => PreferencesResponseDto)
  versions: PreferencesResponseDto[]

  @ApiProperty()
  total: number
}
