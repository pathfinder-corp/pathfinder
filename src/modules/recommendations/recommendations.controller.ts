import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../users/entities/user.entity'
import {
  RecommendedMentorDto,
  RecommendationsResponseDto
} from './dto/recommendation-response.dto'
import { RecommendationsService } from './recommendations.service'

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get recommended mentors based on preferences',
    description:
      "Returns a ranked list of mentors that best match the current user's preferences. Set preferences first for personalized results."
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum mentors to return (default: 10)'
  })
  @ApiQuery({
    name: 'minScore',
    required: false,
    type: Number,
    description: 'Minimum match score 0-100 (default: 0)'
  })
  @ApiResponse({ status: 200, type: RecommendationsResponseDto })
  async getRecommendations(
    @CurrentUser() user: User,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('minScore', new DefaultValuePipe(0), ParseIntPipe) minScore: number
  ): Promise<RecommendationsResponseDto> {
    const result = await this.recommendationsService.getRecommendations(
      user.id,
      { limit, minScore }
    )

    return {
      recommendations: result.recommendations,
      total: result.total,
      strategy: result.strategy
    }
  }

  @Get('mentor/:mentorId')
  @ApiOperation({
    summary: 'Get match score for a specific mentor',
    description:
      'Returns the compatibility score between your preferences and a specific mentor.'
  })
  @ApiResponse({ status: 200, type: RecommendedMentorDto })
  async getMentorScore(
    @CurrentUser() user: User,
    @Param('mentorId', ParseUUIDPipe) mentorId: string
  ): Promise<RecommendedMentorDto | { message: string }> {
    const result = await this.recommendationsService.getMentorScore(
      user.id,
      mentorId
    )

    if (!result) {
      return { message: 'Set your preferences to see match scores' }
    }

    return result
  }
}
