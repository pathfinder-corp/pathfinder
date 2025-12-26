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
  Query,
  UseGuards,
  UseInterceptors
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
import { GenerateRoadmapDto } from './dto/generate-roadmap.dto'
import {
  RoadmapInsightRequestDto,
  RoadmapInsightResponseDto
} from './dto/roadmap-insight.dto'
import { RoadmapResponseDto } from './dto/roadmap-response.dto'
import { RoadmapShareStateDto, ShareRoadmapDto } from './dto/share-roadmap.dto'
import { SharedUserDto } from './dto/shared-user.dto'
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
  @ApiQuery({
    name: 'useMapReduce',
    required: false,
    type: Boolean,
    description:
      'Use MapReduce pattern for generation (faster, more resilient). Default: false for backward compatibility'
  })
  @ApiResponse({
    status: 200,
    description: 'Roadmap generated successfully',
    type: RoadmapResponseDto
  })
  async createRoadmap(
    @CurrentUser() user: User,
    @Body() generateRoadmapDto: GenerateRoadmapDto,
    @Query('useMapReduce') useMapReduce?: string
  ): Promise<RoadmapResponseDto> {
    // Parse query param (can be 'true', '1', 'yes')
    const shouldUseMapReduce =
      useMapReduce === 'true' || useMapReduce === '1' || useMapReduce === 'yes'

    if (shouldUseMapReduce) {
      return await this.roadmapsService.generateRoadmapWithMapReduce(
        user,
        generateRoadmapDto
      )
    }

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

  @Get('shared')
  @ApiOperation({
    summary: 'List roadmaps shared privately with the authenticated user'
  })
  @ApiResponse({
    status: 200,
    description: 'Shared roadmaps retrieved successfully',
    type: RoadmapResponseDto,
    isArray: true
  })
  async getSharedRoadmaps(
    @CurrentUser() user: User
  ): Promise<RoadmapResponseDto[]> {
    return await this.roadmapsService.getSharedRoadmaps(user.id)
  }

  @Get('public')
  @ApiOperation({
    summary: 'List roadmaps shared publicly by other users'
  })
  @ApiResponse({
    status: 200,
    description: 'Public roadmaps retrieved successfully',
    type: RoadmapResponseDto,
    isArray: true
  })
  async getPublicRoadmaps(
    @CurrentUser() user: User
  ): Promise<RoadmapResponseDto[]> {
    return await this.roadmapsService.getPublicRoadmaps(user.id)
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
    return await this.roadmapsService.getRoadmapById(
      user.id,
      roadmapId,
      user.role
    )
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

  @Get(':id/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve sharing settings for a roadmap' })
  @ApiResponse({
    status: 200,
    description: 'Roadmap sharing settings retrieved successfully',
    type: RoadmapShareStateDto
  })
  async getRoadmapShareState(
    @CurrentUser() user: User,
    @Param('id') roadmapId: string
  ): Promise<RoadmapShareStateDto> {
    return await this.roadmapsService.getShareState(user.id, roadmapId)
  }

  @Get(':id/shared-users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get list of users with whom the roadmap is shared'
  })
  @ApiResponse({
    status: 200,
    description: 'Shared users retrieved successfully',
    type: SharedUserDto,
    isArray: true
  })
  @ApiResponse({ status: 404, description: 'Roadmap not found' })
  async getSharedUsers(
    @CurrentUser() user: User,
    @Param('id') roadmapId: string
  ): Promise<SharedUserDto[]> {
    return await this.roadmapsService.getSharedUsers(user.id, roadmapId)
  }

  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Share a roadmap with specific users or all registered users'
  })
  @ApiResponse({
    status: 200,
    description: 'Roadmap sharing settings updated successfully',
    type: RoadmapShareStateDto
  })
  async shareRoadmap(
    @CurrentUser() user: User,
    @Param('id') roadmapId: string,
    @Body() shareDto: ShareRoadmapDto
  ): Promise<RoadmapShareStateDto> {
    return await this.roadmapsService.updateShareSettings(
      user.id,
      roadmapId,
      shareDto
    )
  }

  @Delete(':id/share/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke roadmap access from a shared user' })
  @ApiResponse({
    status: 204,
    description: 'Roadmap access revoked successfully'
  })
  async revokeRoadmapShare(
    @CurrentUser() user: User,
    @Param('id') roadmapId: string,
    @Param('userId') sharedWithUserId: string
  ): Promise<void> {
    await this.roadmapsService.revokeShare(user.id, roadmapId, sharedWithUserId)
  }
}
