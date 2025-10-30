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
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserRole } from '../users/entities/user.entity'
import { CourseService } from './course.service'
import { CourseResponseDto } from './dto/course-response.dto'
import { CreateCourseDto } from './dto/create-course.dto'
import { CourseCategory, CourseLevel } from './entities/course.entity'

@ApiTags('Courses')
@Controller('courses')
@UseInterceptors(ClassSerializerInterceptor)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create course (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Course created',
    type: CourseResponseDto
  })
  async create(@Body() createDto: CreateCourseDto) {
    return await this.courseService.create(createDto)
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  @ApiQuery({ name: 'category', enum: CourseCategory, required: false })
  @ApiQuery({ name: 'level', enum: CourseLevel, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved',
    type: [CourseResponseDto]
  })
  async findAll(
    @Query('category') category?: CourseCategory,
    @Query('level') level?: CourseLevel,
    @Query('search') search?: string
  ) {
    return await this.courseService.findAll(category, level, search)
  }

  @Get('stats/by-category')
  @ApiOperation({ summary: 'Get course count by category' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getStatsByCategory() {
    return await this.courseService.countByCategory()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({
    status: 200,
    description: 'Course retrieved',
    type: CourseResponseDto
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(@Param('id') id: string) {
    return await this.courseService.findOne(id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Course updated',
    type: CourseResponseDto
  })
  async update(@Param('id') id: string, @Body() updateDto: Partial<CreateCourseDto>) {
    return await this.courseService.update(id, updateDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete course (Admin only)' })
  @ApiResponse({ status: 204, description: 'Course deleted' })
  async delete(@Param('id') id: string) {
    await this.courseService.delete(id)
  }
}

