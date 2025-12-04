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
  AdminAssessmentDetailResponseDto,
  AdminAssessmentQueryDto,
  AdminAssessmentResponseDto
} from '../dto/admin-assessment.dto'
import { PaginatedResponseDto } from '../dto/pagination.dto'
import { AdminAssessmentsService } from '../services/admin-assessments.service'

@ApiTags('Admin - Assessments')
@Controller('admin/assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminAssessmentsController {
  constructor(
    private readonly adminAssessmentsService: AdminAssessmentsService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all assessments with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of assessments'
  })
  async findAll(
    @Query() query: AdminAssessmentQueryDto
  ): Promise<PaginatedResponseDto<AdminAssessmentResponseDto>> {
    return this.adminAssessmentsService.findAll(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assessment details with owner info' })
  @ApiResponse({
    status: 200,
    description: 'Assessment details with results and owner information',
    type: AdminAssessmentDetailResponseDto
  })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string
  ): Promise<AdminAssessmentDetailResponseDto> {
    return this.adminAssessmentsService.findOne(id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete any assessment' })
  @ApiResponse({ status: 204, description: 'Assessment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.adminAssessmentsService.remove(id)
  }
}

