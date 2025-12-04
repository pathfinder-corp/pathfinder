import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards
} from '@nestjs/common'
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
  AdminRoadmapDetailResponseDto,
  AdminRoadmapQueryDto,
  AdminRoadmapResponseDto
} from '../dto/admin-roadmap.dto'
import { PaginatedResponseDto } from '../dto/pagination.dto'
import { AdminRoadmapsService } from '../services/admin-roadmaps.service'

@ApiTags('Admin - Roadmaps')
@Controller('admin/roadmaps')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminRoadmapsController {
  constructor(private readonly adminRoadmapsService: AdminRoadmapsService) {}

  @Get()
  @ApiOperation({ summary: 'List all roadmaps with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of roadmaps'
  })
  async findAll(
    @Query() query: AdminRoadmapQueryDto
  ): Promise<PaginatedResponseDto<AdminRoadmapResponseDto>> {
    return this.adminRoadmapsService.findAll(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get roadmap details with owner info' })
  @ApiResponse({
    status: 200,
    description: 'Roadmap details with full content and owner information',
    type: AdminRoadmapDetailResponseDto
  })
  @ApiResponse({ status: 404, description: 'Roadmap not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string
  ): Promise<AdminRoadmapDetailResponseDto> {
    return this.adminRoadmapsService.findOne(id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete any roadmap' })
  @ApiResponse({ status: 204, description: 'Roadmap deleted successfully' })
  @ApiResponse({ status: 404, description: 'Roadmap not found' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.adminRoadmapsService.remove(id)
  }
}

