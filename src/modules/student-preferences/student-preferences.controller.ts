import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Put,
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
import { plainToInstance } from 'class-transformer'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../users/entities/user.entity'
import {
  PreferencesHistoryResponseDto,
  PreferencesResponseDto
} from './dto/preferences-response.dto'
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto'
import { StudentPreferencesService } from './student-preferences.service'

@ApiTags('Student Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('student-preferences')
export class StudentPreferencesController {
  constructor(private readonly preferencesService: StudentPreferencesService) {}

  @Put()
  @ApiOperation({
    summary: 'Create or update preferences (creates new version)'
  })
  @ApiResponse({ status: 200, type: PreferencesResponseDto })
  async upsert(
    @CurrentUser() user: User,
    @Body() dto: UpsertPreferencesDto
  ): Promise<PreferencesResponseDto> {
    const preference = await this.preferencesService.upsert(user.id, dto)

    return plainToInstance(PreferencesResponseDto, preference, {
      excludeExtraneousValues: true
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get latest preferences' })
  @ApiResponse({ status: 200, type: PreferencesResponseDto })
  async getLatest(
    @CurrentUser() user: User
  ): Promise<PreferencesResponseDto | null> {
    const preference = await this.preferencesService.getLatest(user.id)

    if (!preference) {
      return null
    }

    return plainToInstance(PreferencesResponseDto, preference, {
      excludeExtraneousValues: true
    })
  }

  @Get('history')
  @ApiOperation({ summary: 'Get preference version history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PreferencesHistoryResponseDto })
  async getHistory(
    @CurrentUser() user: User,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ): Promise<PreferencesHistoryResponseDto> {
    const { versions, total } = await this.preferencesService.getHistory(
      user.id,
      limit
    )

    return {
      versions: versions.map((v) =>
        plainToInstance(PreferencesResponseDto, v, {
          excludeExtraneousValues: true
        })
      ),
      total
    }
  }
}
