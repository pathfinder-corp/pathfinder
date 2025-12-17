import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength
} from 'class-validator'

export class CreateApplicationDto {
  @ApiProperty({ description: 'Professional headline', maxLength: 200 })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  headline: string

  @ApiProperty({ description: 'Bio/introduction', maxLength: 2000 })
  @IsString()
  @MinLength(50)
  @MaxLength(2000)
  bio: string

  @ApiProperty({
    description: 'Areas of expertise',
    type: [String],
    example: ['Software Engineering', 'Cloud Architecture']
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  expertise: string[]

  @ApiProperty({
    description: 'Technical and soft skills',
    type: [String],
    example: ['JavaScript', 'Leadership', 'System Design']
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  skills: string[]

  @ApiPropertyOptional({
    description: 'Industries worked in',
    type: [String],
    example: ['FinTech', 'Healthcare']
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  industries?: string[]

  @ApiProperty({
    description: 'Languages spoken',
    type: [String],
    example: ['English', 'Spanish']
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  languages: string[]

  @ApiProperty({ description: 'Years of professional experience', minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(50)
  yearsExperience: number

  @ApiPropertyOptional({ description: 'LinkedIn profile URL' })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string

  @ApiPropertyOptional({ description: 'Portfolio or personal website URL' })
  @IsOptional()
  @IsUrl()
  portfolioUrl?: string

  @ApiProperty({
    description: 'Motivation for becoming a mentor',
    maxLength: 1000
  })
  @IsString()
  @MinLength(50)
  @MaxLength(1000)
  motivation: string
}
