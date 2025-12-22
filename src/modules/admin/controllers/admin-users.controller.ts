import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'

import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { User, UserRole } from '../../users/entities/user.entity'
import {
  AdminUpdateUserDto,
  AdminUserDetailResponseDto,
  AdminUserQueryDto,
  AdminUserResponseDto
} from '../dto/admin-user.dto'
import { PaginatedResponseDto } from '../dto/pagination.dto'
import { AdminUsersService } from '../services/admin-users.service'

@ApiTags('Admin - Users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users'
  })
  async findAll(
    @Query() query: AdminUserQueryDto
  ): Promise<PaginatedResponseDto<AdminUserResponseDto>> {
    return this.adminUsersService.findAll(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details with content counts' })
  @ApiResponse({
    status: 200,
    description: 'User details with roadmap and assessment counts',
    type: AdminUserDetailResponseDto
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string
  ): Promise<AdminUserDetailResponseDto> {
    return this.adminUsersService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user role or status' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: AdminUserResponseDto
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Cannot modify admin users' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateDto: AdminUpdateUserDto,
    @CurrentUser() currentUser: User
  ): Promise<AdminUserResponseDto> {
    return this.adminUsersService.update(id, updateDto, currentUser)
  }

  @Patch(':id/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban a user (suspend account)' })
  @ApiResponse({
    status: 200,
    description: 'User banned successfully',
    type: AdminUserResponseDto
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Cannot ban admin users' })
  async banUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: User
  ): Promise<AdminUserResponseDto> {
    return this.adminUsersService.banUser(id, currentUser)
  }

  @Patch(':id/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unban a user (reactivate account)' })
  @ApiResponse({
    status: 200,
    description: 'User unbanned successfully',
    type: AdminUserResponseDto
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unbanUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: User
  ): Promise<AdminUserResponseDto> {
    return this.adminUsersService.unbanUser(id, currentUser)
  }
}
