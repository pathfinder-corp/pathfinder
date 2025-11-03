import {
  Body,
  ClassSerializerInterceptor,
  Controller,
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
}
