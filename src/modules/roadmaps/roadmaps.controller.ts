import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
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
    @Body() generateRoadmapDto: GenerateRoadmapDto
  ): Promise<RoadmapResponseDto> {
    return await this.roadmapsService.generateRoadmap(generateRoadmapDto)
  }
}
