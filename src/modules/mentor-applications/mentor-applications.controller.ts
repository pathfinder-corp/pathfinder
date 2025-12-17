import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { plainToInstance } from 'class-transformer'

import { IpAddress } from '../../common/decorators/ip-address.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User, UserRole } from '../users/entities/user.entity'
import { ApplicationResponseDto } from './dto/application-response.dto'
import { CreateApplicationDto } from './dto/create-application.dto'
import { ApplicationStatus } from './entities/mentor-application.entity'
import { MentorApplicationsService } from './mentor-applications.service'

@ApiTags('Mentor Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mentor-applications')
export class MentorApplicationsController {
  constructor(
    private readonly applicationsService: MentorApplicationsService
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 604800000 } }) // 5 applications per week
  @ApiOperation({ summary: 'Submit a mentor application' })
  @ApiResponse({ status: 201, type: ApplicationResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Validation error or cooldown active'
  })
  @ApiResponse({
    status: 403,
    description: 'Email not verified or admin user'
  })
  @ApiResponse({
    status: 409,
    description: 'Pending application exists or already a mentor'
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded'
  })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateApplicationDto,
    @IpAddress() ip: string
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationsService.create(user.id, dto, ip)

    return plainToInstance(ApplicationResponseDto, application, {
      excludeExtraneousValues: true
    })
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my applications' })
  @ApiResponse({ status: 200, type: [ApplicationResponseDto] })
  async getMyApplications(
    @CurrentUser() user: User
  ): Promise<ApplicationResponseDto[]> {
    const applications = await this.applicationsService.findByUser(user.id)

    return applications.map((app) => {
      const response = plainToInstance(ApplicationResponseDto, app, {
        excludeExtraneousValues: true
      })
      // Only include decline reason if status is declined
      if (app.status !== ApplicationStatus.DECLINED) {
        delete response.declineReason
      }
      return response
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  @ApiResponse({ status: 200, type: ApplicationResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to view this application'
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationsService.findOne(id)

    // Non-admin users can only view their own applications
    if (user.role !== UserRole.ADMIN && application.userId !== user.id) {
      throw new ForbiddenException('Not authorized to view this application')
    }

    const response = plainToInstance(ApplicationResponseDto, application, {
      excludeExtraneousValues: true
    })

    // Hide decline reason from non-owners unless declined
    if (
      application.userId !== user.id ||
      application.status !== ApplicationStatus.DECLINED
    ) {
      delete response.declineReason
    }

    return response
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Withdraw my application' })
  @ApiResponse({ status: 204, description: 'Application withdrawn' })
  @ApiResponse({ status: 400, description: 'Cannot withdraw this application' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async withdraw(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    await this.applicationsService.withdraw(id, user.id)
  }
}
