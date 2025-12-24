import type { Response } from 'express'

import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { plainToInstance } from 'class-transformer'
import { memoryStorage } from 'multer'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import {
  UpdateDocumentDto,
  UploadDocumentDto
} from '../mentor-applications/dto/upload-document.dto'
import { DocumentUploadService } from '../mentor-applications/services/document-upload.service'
import { User, UserRole } from '../users/entities/user.entity'
import {
  MentorDocumentDto,
  MentorProfileWithDocumentsDto
} from './dto/mentor-document.dto'
import {
  MentorListResponseDto,
  MentorProfileResponseDto
} from './dto/mentor-profile-response.dto'
import { SearchMentorsQueryDto } from './dto/search-mentors.dto'
import { UpdateMentorProfileDto } from './dto/update-profile.dto'
import { MentorProfilesService } from './mentor-profiles.service'
import { MentorReviewsService } from './services/mentor-reviews.service'

@ApiTags('Mentor Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mentor-profiles')
export class MentorProfilesController {
  constructor(
    private readonly profilesService: MentorProfilesService,
    private readonly documentUploadService: DocumentUploadService,
    private readonly reviewsService: MentorReviewsService
  ) {}

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

    const mentorsWithStats = await Promise.all(
      mentors.map(async (m) => {
        const reviewStats = await this.reviewsService.getReviewStats(m.userId)
        const mentorDto = plainToInstance(MentorProfileResponseDto, m, {
          excludeExtraneousValues: true
        })
        mentorDto.reviewStats = reviewStats
        return mentorDto
      })
    )

    return {
      mentors: mentorsWithStats,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  @Get('me/documents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MENTOR)
  @ApiOperation({ summary: 'Get my documents (all statuses)' })
  @ApiResponse({ status: 200, type: [MentorDocumentDto] })
  async getMyDocuments(
    @CurrentUser() user: User
  ): Promise<MentorDocumentDto[]> {
    const documents = await this.profilesService.getMyDocuments(user.id)

    return documents.map((doc) =>
      plainToInstance(MentorDocumentDto, doc, {
        excludeExtraneousValues: true
      })
    )
  }

  @Post('me/documents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MENTOR)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new document to my profile' })
  @ApiBody({
    description: 'Document file and metadata',
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: ['certificate', 'award', 'portfolio', 'recommendation', 'other']
        },
        title: { type: 'string', maxLength: 200 },
        description: { type: 'string', maxLength: 1000 },
        issuedYear: { type: 'integer', minimum: 1990 },
        issuingOrganization: { type: 'string', maxLength: 255 }
      }
    }
  })
  @ApiResponse({ status: 201, type: MentorDocumentDto })
  @ApiResponse({ status: 400, description: 'Invalid file or data' })
  async uploadDocument(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto
  ): Promise<MentorDocumentDto> {
    const document = await this.profilesService.uploadDocument(
      user.id,
      file,
      dto
    )

    return plainToInstance(MentorDocumentDto, document, {
      excludeExtraneousValues: true
    })
  }

  @Patch('me/documents/:documentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MENTOR)
  @ApiOperation({ summary: 'Update document metadata' })
  @ApiResponse({ status: 200, type: MentorDocumentDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async updateDocument(
    @CurrentUser() user: User,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: UpdateDocumentDto
  ): Promise<MentorDocumentDto> {
    const document = await this.profilesService.updateDocument(
      user.id,
      documentId,
      dto
    )

    return plainToInstance(MentorDocumentDto, document, {
      excludeExtraneousValues: true
    })
  }

  @Delete('me/documents/:documentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MENTOR)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @CurrentUser() user: User,
    @Param('documentId', ParseUUIDPipe) documentId: string
  ): Promise<{ message: string }> {
    await this.profilesService.deleteDocument(user.id, documentId)

    return { message: 'Document deleted successfully' }
  }

  @Delete('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MENTOR)
  @ApiOperation({ summary: 'Withdraw from being a mentor (self-demote)' })
  @ApiResponse({
    status: 200,
    description: 'Mentor role withdrawn successfully'
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot withdraw while there are active mentorships as a mentor'
  })
  async withdrawAsMentor(
    @CurrentUser() user: User
  ): Promise<{ message: string }> {
    await this.profilesService.withdrawAsMentor(user.id)

    return { message: 'You have withdrawn from being a mentor.' }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mentor profile by ID' })
  @ApiResponse({ status: 200, type: MentorProfileResponseDto })
  @ApiResponse({ status: 404, description: 'Mentor not found' })
  async getProfile(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<MentorProfileResponseDto> {
    const profile = await this.profilesService.findPublicProfile(id)

    // Get review stats
    const reviewStats = await this.reviewsService.getReviewStats(profile.userId)

    const profileDto = plainToInstance(MentorProfileResponseDto, profile, {
      excludeExtraneousValues: true
    })

    // Add review stats
    profileDto.reviewStats = reviewStats

    return profileDto
  }

  @Get(':id/with-documents')
  @ApiOperation({ summary: 'Get mentor profile with verified documents' })
  @ApiResponse({ status: 200, type: MentorProfileWithDocumentsDto })
  @ApiResponse({ status: 404, description: 'Mentor not found' })
  async getProfileWithDocuments(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<MentorProfileWithDocumentsDto> {
    const { profile, documents } =
      await this.profilesService.findPublicProfileWithDocuments(id)

    const result = plainToInstance(MentorProfileWithDocumentsDto, profile, {
      excludeExtraneousValues: true
    })

    result.documents = documents.map((doc) =>
      plainToInstance(MentorDocumentDto, doc, {
        excludeExtraneousValues: true
      })
    )

    return result
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get verified documents for a mentor' })
  @ApiResponse({ status: 200, type: [MentorDocumentDto] })
  @ApiResponse({ status: 404, description: 'Mentor not found' })
  async getMentorDocuments(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<MentorDocumentDto[]> {
    // First verify the profile exists and is public
    const profile = await this.profilesService.findPublicProfile(id)

    // Get verified documents
    const documents = await this.profilesService.getMentorDocuments(
      profile.userId
    )

    return documents.map((doc) =>
      plainToInstance(MentorDocumentDto, doc, {
        excludeExtraneousValues: true
      })
    )
  }

  @Public()
  @Get(':id/documents/:documentId/view')
  @ApiOperation({
    summary: 'View a verified document (redirects to ImageKit CDN)'
  })
  @ApiResponse({ status: 302, description: 'Redirect to ImageKit URL' })
  @ApiResponse({
    status: 404,
    description: 'Document not found or not verified'
  })
  async viewDocument(
    @Param('id', ParseUUIDPipe) profileId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response
  ): Promise<void> {
    // Verify mentor profile exists and is active
    await this.profilesService.findPublicProfile(profileId)

    // Get ImageKit URL for verified document
    const imagekitUrl =
      await this.documentUploadService.getDocumentPublicUrl(documentId)

    if (!imagekitUrl) {
      throw new NotFoundException('Document not found or not verified')
    }

    // Redirect to ImageKit CDN for optimal delivery
    res.redirect(302, imagekitUrl)
  }
}
