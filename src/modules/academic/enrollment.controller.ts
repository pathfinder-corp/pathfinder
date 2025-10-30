import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { User } from '../users/entities/user.entity'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { EnrollmentResponseDto } from './dto/enrollment-response.dto'
import { EnrollmentService } from './enrollment.service'

@ApiTags('Enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({
    status: 201,
    description: 'Enrolled successfully',
    type: EnrollmentResponseDto
  })
  @ApiResponse({ status: 400, description: 'Already enrolled' })
  async enroll(
    @CurrentUser() user: User,
    @Body('courseId') courseId: string
  ) {
    return await this.enrollmentService.enroll(user.id, courseId)
  }

  @Get()
  @ApiOperation({ summary: 'Get my enrollments' })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved',
    type: [EnrollmentResponseDto]
  })
  async getMyEnrollments(@CurrentUser() user: User) {
    return await this.enrollmentService.findByUser(user.id)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get enrollment statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getStats(@CurrentUser() user: User) {
    return await this.enrollmentService.getStats(user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enrollment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment retrieved',
    type: EnrollmentResponseDto
  })
  async getOne(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.enrollmentService.findOne(id, user.id)
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: 'Update enrollment progress' })
  @ApiResponse({
    status: 200,
    description: 'Progress updated',
    type: EnrollmentResponseDto
  })
  async updateProgress(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('progress') progress: number
  ) {
    return await this.enrollmentService.updateProgress(id, user.id, progress)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Drop a course' })
  @ApiResponse({ status: 204, description: 'Course dropped' })
  async drop(@CurrentUser() user: User, @Param('id') id: string) {
    await this.enrollmentService.drop(id, user.id)
  }
}

