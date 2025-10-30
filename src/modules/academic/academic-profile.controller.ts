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
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserRole } from '../users/entities/user.entity'
import { AcademicProfileService } from './academic-profile.service'
import { AcademicProfileResponseDto } from './dto/academic-profile-response.dto'
import { CreateAcademicProfileDto } from './dto/create-academic-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'

@ApiTags('Academic Profile')
@Controller('academic/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
export class AcademicProfileController {
  constructor(
    private readonly academicProfileService: AcademicProfileService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create academic profile' })
  @ApiResponse({
    status: 201,
    description: 'Profile created',
    type: AcademicProfileResponseDto
  })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async create(
    @CurrentUser() user: User,
    @Body() createDto: CreateAcademicProfileDto
  ) {
    return await this.academicProfileService.create(user.id, createDto)
  }

  @Get()
  @ApiOperation({ summary: 'Get own academic profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved',
    type: AcademicProfileResponseDto
  })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getOwn(@CurrentUser() user: User) {
    return await this.academicProfileService.findByUserId(user.id)
  }

  @Patch()
  @ApiOperation({ summary: 'Update own academic profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated',
    type: AcademicProfileResponseDto
  })
  async update(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateAcademicProfileDto
  ) {
    return await this.academicProfileService.update(user.id, updateDto)
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own academic profile' })
  @ApiResponse({ status: 204, description: 'Profile deleted' })
  async delete(@CurrentUser() user: User) {
    await this.academicProfileService.delete(user.id)
  }

  @Get('all')
  @Roles(UserRole.ADMIN, UserRole.COUNSELOR)
  @ApiOperation({ summary: 'Get all academic profiles (Admin/Counselor only)' })
  @ApiResponse({
    status: 200,
    description: 'Profiles retrieved',
    type: [AcademicProfileResponseDto]
  })
  async getAll() {
    return await this.academicProfileService.findAll()
  }

  @Get(':userId')
  @Roles(UserRole.ADMIN, UserRole.COUNSELOR)
  @ApiOperation({ summary: 'Get user profile by ID (Admin/Counselor only)' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved',
    type: AcademicProfileResponseDto
  })
  async getByUserId(@Param('userId') userId: string) {
    return await this.academicProfileService.findByUserId(userId)
  }
}

