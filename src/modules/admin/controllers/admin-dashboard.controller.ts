import { Controller, Get, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'

import { Roles } from '../../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { UserRole } from '../../users/entities/user.entity'
import {
  AssessmentStatsDto,
  OverviewStatsDto,
  RoadmapStatsDto,
  UserStatsDto
} from '../dto/dashboard-stats.dto'
import { AdminStatsService } from '../services/admin-stats.service'

@ApiTags('Admin - Dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get overview dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Overview statistics',
    type: OverviewStatsDto
  })
  async getOverviewStats(): Promise<OverviewStatsDto> {
    return this.adminStatsService.getOverviewStats()
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({
    status: 200,
    description: 'User statistics by role, status, and registration trends',
    type: UserStatsDto
  })
  async getUserStats(): Promise<UserStatsDto> {
    return this.adminStatsService.getUserStats()
  }

  @Get('roadmaps')
  @ApiOperation({ summary: 'Get roadmap statistics' })
  @ApiResponse({
    status: 200,
    description: 'Roadmap statistics with generation trends and popular topics',
    type: RoadmapStatsDto
  })
  async getRoadmapStats(): Promise<RoadmapStatsDto> {
    return this.adminStatsService.getRoadmapStats()
  }

  @Get('assessments')
  @ApiOperation({ summary: 'Get assessment statistics' })
  @ApiResponse({
    status: 200,
    description:
      'Assessment statistics with completion rates and popular domains',
    type: AssessmentStatsDto
  })
  async getAssessmentStats(): Promise<AssessmentStatsDto> {
    return this.adminStatsService.getAssessmentStats()
  }
}
