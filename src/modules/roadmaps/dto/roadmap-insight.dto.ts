import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

const trimValue = ({ value }: { value: string }) =>
  typeof value === 'string' ? value.trim() : value

export class RoadmapInsightRequestDto {
  @ApiProperty({
    description:
      'Follow-up question or clarification request about a roadmap phase or step',
    example:
      'Can you explain what project I should build during the Prototyping phase?'
  })
  @IsString()
  @IsNotEmpty()
  @Transform(trimValue)
  @MaxLength(1000)
  question!: string

  @ApiPropertyOptional({
    description:
      'Optional hint about which phase the question refers to, used to enrich the LLM prompt',
    example: 'Prototyping'
  })
  @IsOptional()
  @IsString()
  @Transform(trimValue)
  @MaxLength(150)
  phaseTitle?: string

  @ApiPropertyOptional({
    description:
      'Optional hint about which step the question refers to, used to enrich the LLM prompt',
    example: 'Build a clickable wireframe in Figma'
  })
  @IsOptional()
  @IsString()
  @Transform(trimValue)
  @MaxLength(150)
  stepTitle?: string
}

export class RoadmapInsightResponseDto {
  @ApiProperty({
    description: 'LLM-generated explanation tailored to the provided roadmap',
    example:
      'During the Prototyping phase, focus on iterating quickly on user feedback. Start with a low-fidelity wireframe, then build an interactive prototype in Figma to validate layout and flow before coding.'
  })
  answer!: string
}
