import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
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
  MarkNotificationsReadDto,
  MarkReadResponseDto
} from './dto/mark-read.dto'
import {
  NotificationListResponseDto,
  NotificationResponseDto
} from './dto/notification-response.dto'
import { NotificationsService } from './notifications.service'

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: NotificationListResponseDto })
  async getNotifications(
    @CurrentUser() user: User,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe)
    unreadOnly: boolean
  ): Promise<NotificationListResponseDto> {
    const result = await this.notificationsService.findByUser(user.id, {
      limit,
      offset,
      unreadOnly
    })

    return {
      notifications: result.notifications.map((n) =>
        plainToInstance(NotificationResponseDto, n, {
          excludeExtraneousValues: true
        })
      ),
      total: result.total,
      unreadCount: result.unreadCount
    }
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    schema: { properties: { count: { type: 'number' } } }
  })
  async getUnreadCount(@CurrentUser() user: User): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(user.id)
    return { count }
  }

  @Post('mark-read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, type: MarkReadResponseDto })
  async markAsRead(
    @CurrentUser() user: User,
    @Body() dto: MarkNotificationsReadDto
  ): Promise<MarkReadResponseDto> {
    const markedCount = await this.notificationsService.markAsRead(
      user.id,
      dto.notificationIds
    )

    return {
      success: true,
      markedCount
    }
  }
}
