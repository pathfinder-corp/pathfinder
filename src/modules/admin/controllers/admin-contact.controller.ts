import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
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

import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { ContactMessageResponseDto } from '../../contact/dto/contact-response.dto'
import { User, UserRole } from '../../users/entities/user.entity'
import {
  AdminContactQueryDto,
  RespondToContactDto,
  UpdateContactStatusDto
} from '../dto/admin-contact.dto'
import { PaginatedResponseDto } from '../dto/pagination.dto'
import { AdminContactService } from '../services/admin-contact.service'

@ApiTags('Admin - Contact')
@Controller('admin/contact')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminContactController {
  constructor(private readonly adminContactService: AdminContactService) {}

  @Get()
  @ApiOperation({ summary: 'List all contact messages with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of contact messages'
  })
  async findAll(
    @Query() query: AdminContactQueryDto
  ): Promise<PaginatedResponseDto<ContactMessageResponseDto>> {
    const result = await this.adminContactService.findAll(query)

    const data = result.data.map((contact) =>
      plainToInstance(ContactMessageResponseDto, contact, {
        excludeExtraneousValues: true
      })
    )

    return new PaginatedResponseDto(
      data,
      result.meta.total,
      result.meta.page,
      result.meta.limit
    )
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get contact messages statistics' })
  @ApiResponse({
    status: 200,
    description: 'Contact messages statistics'
  })
  async getStats() {
    return this.adminContactService.getStats()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact message by ID' })
  @ApiResponse({
    status: 200,
    description: 'Contact message details',
    type: ContactMessageResponseDto
  })
  @ApiResponse({ status: 404, description: 'Contact message not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ContactMessageResponseDto> {
    const contact = await this.adminContactService.findOne(id)

    return plainToInstance(ContactMessageResponseDto, contact, {
      excludeExtraneousValues: true
    })
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update contact message status' })
  @ApiResponse({
    status: 200,
    description: 'Contact message status updated',
    type: ContactMessageResponseDto
  })
  @ApiResponse({ status: 404, description: 'Contact message not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactStatusDto,
    @CurrentUser() admin: User
  ): Promise<ContactMessageResponseDto> {
    const contact = await this.adminContactService.updateStatus(
      id,
      dto.status,
      admin.id
    )

    return plainToInstance(ContactMessageResponseDto, contact, {
      excludeExtraneousValues: true
    })
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to a contact message' })
  @ApiResponse({
    status: 200,
    description: 'Response sent successfully',
    type: ContactMessageResponseDto
  })
  @ApiResponse({ status: 404, description: 'Contact message not found' })
  @ApiResponse({ status: 400, description: 'Invalid response message' })
  async respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondToContactDto,
    @CurrentUser() admin: User
  ): Promise<ContactMessageResponseDto> {
    const contact = await this.adminContactService.respond(
      id,
      dto.response,
      admin.id
    )

    return plainToInstance(ContactMessageResponseDto, contact, {
      excludeExtraneousValues: true
    })
  }
}