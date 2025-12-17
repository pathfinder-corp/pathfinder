import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { User, UserRole } from '../users/entities/user.entity'
import {
  MentorListResponseDto,
  MentorProfileResponseDto
} from './dto/mentor-profile-response.dto'
import { SearchMentorsQueryDto } from './dto/search-mentors.dto'
import { UpdateMentorProfileDto } from './dto/update-profile.dto'
import { MentorProfilesService } from './mentor-profiles.service'

@ApiTags('Mentor Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mentor-profiles')
export class MentorProfilesController {
  constructor(private readonly profilesService: MentorProfilesService) {}

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MENTOR)
  @ApiOperation({ summary: 'Get my mentor profile' })
  @ApiResponse({ status: 200, type: MentorProfileResponseDto })
  async getMyProfile(
    @CurrentUser() user: User
  ): Promise<MentorProfileResponseDto> {
    const profile = await this.profilesService.getMyProfile(user.id)

    return plainToInstance(MentorProfileResponseDto, profile, {
      excludeExtraneousValues: true
    })
  }

  @Put('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MENTOR)
  @ApiOperation({ summary: 'Update my mentor profile' })
  @ApiResponse({ status: 200, type: MentorProfileResponseDto })
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateMentorProfileDto
  ): Promise<MentorProfileResponseDto> {
    const profile = await this.profilesService.update(user.id, dto)

    return plainToInstance(MentorProfileResponseDto, profile, {
      excludeExtraneousValues: true
    })
  }

  @Get()
  @ApiOperation({ summary: 'Search and list mentors' })
  @ApiResponse({ status: 200, type: MentorListResponseDto })
  async searchMentors(
    @Query() query: SearchMentorsQueryDto
  ): Promise<MentorListResponseDto> {
    const { mentors, total } = await this.profilesService.search(query)

    const page = query.page ?? 1
    const limit = query.limit ?? 20

    return {
      mentors: mentors.map((m) =>
        plainToInstance(MentorProfileResponseDto, m, {
          excludeExtraneousValues: true
        })
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mentor profile by ID' })
  @ApiResponse({ status: 200, type: MentorProfileResponseDto })
  @ApiResponse({ status: 404, description: 'Mentor not found' })
  async getProfile(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<MentorProfileResponseDto> {
    const profile = await this.profilesService.findPublicProfile(id)

    return plainToInstance(MentorProfileResponseDto, profile, {
      excludeExtraneousValues: true
    })
  }
}
