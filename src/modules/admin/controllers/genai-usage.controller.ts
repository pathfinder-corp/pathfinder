import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { InjectRepository } from '@nestjs/typeorm'
import { MoreThanOrEqual, Repository } from 'typeorm'

import { GenAIApiUsage } from '../../../common/entities/genai-api-usage.entity'
import { GenAIKeyManagerService } from '../../../common/services/genai-key-manager.service'
import { Roles } from '../../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { UserRole } from '../../users/entities/user.entity'

class KeyStatusDto {
  keyHash: string
  requestsToday: number
  maxRequests: number
  available: boolean
  lastUsed: Date | null
  consecutiveFailures: number
}

class UsageStatsDto {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalTokens: number
  averageDurationMs: number
  requestsByService: Record<string, number>
  requestsByModel: Record<string, number>
}

class KeyHealthResponseDto {
  keys: KeyStatusDto[]
  totalAvailableRequests: number
  summary: {
    totalKeys: number
    availableKeys: number
    exhaustedKeys: number
    failedKeys: number
  }
}

@ApiTags('admin/genai')
@Controller('admin/genai-usage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class GenAIUsageController {
  constructor(
    private readonly keyManager: GenAIKeyManagerService,
    @InjectRepository(GenAIApiUsage)
    private readonly usageRepository: Repository<GenAIApiUsage>
  ) {}

  @Get('key-health')
  @ApiOperation({ summary: 'Get health status of all API keys' })
  @ApiResponse({
    status: 200,
    description: 'Key health status retrieved successfully',
    type: KeyHealthResponseDto
  })
  async getKeyHealth(): Promise<KeyHealthResponseDto> {
    const statuses = await this.keyManager.getAllKeyStatuses()
    const totalAvailableRequests =
      await this.keyManager.getTotalAvailableRequests()

    const summary = {
      totalKeys: statuses.length,
      availableKeys: statuses.filter((s) => s.available).length,
      exhaustedKeys: statuses.filter(
        (s) => !s.available && s.requestsToday >= s.maxRequests
      ).length,
      failedKeys: statuses.filter(
        (s) => !s.available && s.consecutiveFailures > 0
      ).length
    }

    return {
      keys: statuses,
      totalAvailableRequests,
      summary
    }
  }

  @Get('stats/today')
  @ApiOperation({ summary: 'Get usage statistics for today' })
  @ApiResponse({
    status: 200,
    description: 'Usage statistics retrieved successfully',
    type: UsageStatsDto
  })
  async getTodayStats(): Promise<UsageStatsDto> {
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)

    return this.getStatsForPeriod(startOfDay)
  }

  @Get('stats/week')
  @ApiOperation({ summary: 'Get usage statistics for the past 7 days' })
  @ApiResponse({
    status: 200,
    description: 'Usage statistics retrieved successfully',
    type: UsageStatsDto
  })
  async getWeekStats(): Promise<UsageStatsDto> {
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - 7)
    startOfWeek.setUTCHours(0, 0, 0, 0)

    return this.getStatsForPeriod(startOfWeek)
  }

  @Get('stats/month')
  @ApiOperation({ summary: 'Get usage statistics for the past 30 days' })
  @ApiResponse({
    status: 200,
    description: 'Usage statistics retrieved successfully',
    type: UsageStatsDto
  })
  async getMonthStats(): Promise<UsageStatsDto> {
    const startOfMonth = new Date()
    startOfMonth.setDate(startOfMonth.getDate() - 30)
    startOfMonth.setUTCHours(0, 0, 0, 0)

    return this.getStatsForPeriod(startOfMonth)
  }

  @Post('reset-keys')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset all API key counters (for testing/manual reset)'
  })
  @ApiResponse({
    status: 200,
    description: 'All key counters have been reset'
  })
  async resetKeys(): Promise<{ message: string }> {
    await this.keyManager.resetAllKeys()
    return { message: 'All API key counters have been reset successfully' }
  }

  @Get('recent-errors')
  @ApiOperation({ summary: 'Get recent failed requests' })
  @ApiResponse({
    status: 200,
    description: 'Recent errors retrieved successfully'
  })
  async getRecentErrors(): Promise<GenAIApiUsage[]> {
    return this.usageRepository.find({
      where: { success: false },
      order: { createdAt: 'DESC' },
      take: 50
    })
  }

  private async getStatsForPeriod(startDate: Date): Promise<UsageStatsDto> {
    const usageRecords = await this.usageRepository.find({
      where: {
        createdAt: MoreThanOrEqual(startDate)
      }
    })

    const totalRequests = usageRecords.length
    const successfulRequests = usageRecords.filter((r) => r.success).length
    const failedRequests = totalRequests - successfulRequests

    const totalTokens = usageRecords.reduce(
      (sum, r) => sum + (r.totalTokens || 0),
      0
    )

    const totalDuration = usageRecords.reduce(
      (sum, r) => sum + (r.durationMs || 0),
      0
    )
    const averageDurationMs =
      totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0

    const requestsByService: Record<string, number> = {}
    const requestsByModel: Record<string, number> = {}

    usageRecords.forEach((record) => {
      requestsByService[record.serviceName] =
        (requestsByService[record.serviceName] || 0) + 1
      requestsByModel[record.modelName] =
        (requestsByModel[record.modelName] || 0) + 1
    })

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalTokens,
      averageDurationMs,
      requestsByService,
      requestsByModel
    }
  }
}
