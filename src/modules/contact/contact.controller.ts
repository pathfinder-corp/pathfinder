import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
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
import { Public } from '../auth/decorators/public.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../users/entities/user.entity'
import { ContactService } from './contact.service'
import {
  CreateContactResponseDto,
  ContactMessageResponseDto
} from './dto/contact-response.dto'
import { CreateContactDto } from './dto/create-contact.dto'

@ApiTags('Contact')
@Controller('contact')
@UseGuards(JwtAuthGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a contact message' })
  @ApiResponse({
    status: 201,
    description: 'Contact message created successfully',
    type: CreateContactResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or rate limit exceeded'
  })
  @ApiBearerAuth()
  async create(
    @Body() dto: CreateContactDto,
    @CurrentUser() user?: User
  ): Promise<CreateContactResponseDto> {
    const contactMessage = await this.contactService.create(dto, user?.id)

    const responseDto = plainToInstance(
      ContactMessageResponseDto,
      contactMessage,
      {
        excludeExtraneousValues: true
      }
    )

    return {
      message: 'Contact message created successfully',
      contactMessage: responseDto
    }
  }
}
