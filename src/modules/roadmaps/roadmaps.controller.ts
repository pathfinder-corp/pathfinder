import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../users/entities/user.entity'
import { GenerateRoadmapDto } from './dto/generate-roadmap.dto'
import {
  RoadmapInsightRequestDto,
  RoadmapInsightResponseDto
} from './dto/roadmap-insight.dto'
import { RoadmapResponseDto } from './dto/roadmap-response.dto'
import { RoadmapsService } from './roadmaps.service'

@ApiTags('Roadmaps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('roadmaps')
export class RoadmapsController {
  constructor(private readonly roadmapsService: RoadmapsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a personalized learning roadmap for a specified topic'
  })
  @ApiResponse({
    status: 200,
    description: 'Roadmap generated successfully',
    type: RoadmapResponseDto
  })
  async createRoadmap(
    @CurrentUser() user: User,
    @Body() generateRoadmapDto: GenerateRoadmapDto
  ): Promise<RoadmapResponseDto> {
    return await this.roadmapsService.generateRoadmap(user, generateRoadmapDto)
  }

  @Get()
  @ApiOperation({
    summary: 'List generated roadmaps for the authenticated user'
  })
  @ApiResponse({
    status: 200,
    description: 'Roadmaps retrieved successfully',
    type: RoadmapResponseDto,
    isArray: true
  })
  async getRoadmaps(@CurrentUser() user: User): Promise<RoadmapResponseDto[]> {
    return await this.roadmapsService.getUserRoadmaps(user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a specific roadmap by its identifier' })
  @ApiResponse({
    status: 200,
    description: 'Roadmap retrieved successfully',
    type: RoadmapResponseDto
  })
  @ApiResponse({ status: 404, description: 'Roadmap not found' })
  async getRoadmapById(
    @CurrentUser() user: User,
    @Param('id') roadmapId: string
  ): Promise<RoadmapResponseDto> {
    return await this.roadmapsService.getRoadmapById(user.id, roadmapId)
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all generated roadmaps for the user' })
  @ApiResponse({ status: 204, description: 'Roadmaps deleted successfully' })
  async deleteAllRoadmaps(@CurrentUser() user: User): Promise<void> {
    await this.roadmapsService.deleteAllRoadmaps(user.id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a generated roadmap' })
  @ApiResponse({ status: 204, description: 'Roadmap deleted successfully' })
  @ApiResponse({ status: 404, description: 'Roadmap not found' })
  async deleteRoadmap(
    @CurrentUser() user: User,
    @Param('id') roadmapId: string
  ): Promise<void> {
    await this.roadmapsService.deleteRoadmap(user.id, roadmapId)
  }

  @Post(':id/insight')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ask a follow-up question about a roadmap using the full roadmap as context'
  })
  @ApiResponse({
    status: 200,
    description: 'Insight generated successfully',
    type: RoadmapInsightResponseDto
  })
  async generateRoadmapInsight(
    @CurrentUser() user: User,
    @Param('id') roadmapId: string,
    @Body() insightDto: RoadmapInsightRequestDto
  ): Promise<RoadmapInsightResponseDto> {
    return await this.roadmapsService.generateRoadmapInsight(
      user.id,
      roadmapId,
      insightDto
    )
  }
}
