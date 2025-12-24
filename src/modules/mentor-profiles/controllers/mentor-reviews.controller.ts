import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { Public } from '../../auth/decorators/public.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { User, UserRole } from '../../users/entities/user.entity'
import { CreateMentorReviewDto } from '../dto/create-review.dto'
import {
  MentorReviewResponseDto,
  MentorReviewStatsDto
} from '../dto/review-response.dto'
import { UpdateMentorReviewDto } from '../dto/update-review.dto'
import { MentorReviewsService } from '../services/mentor-reviews.service'

@ApiTags('Mentor Reviews')
@Controller('mentors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MentorReviewsController {
  constructor(private readonly reviewsService: MentorReviewsService) {}

  @Post(':mentorId/reviews')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Create a review for a mentor' })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: MentorReviewResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Already reviewed or validation failed'
  })
  @ApiResponse({ status: 403, description: 'Only students can create reviews' })
  @ApiResponse({ status: 404, description: 'Mentor or mentorship not found' })
  async createReview(
    @Param('mentorId', ParseUUIDPipe) mentorId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateMentorReviewDto
  ): Promise<MentorReviewResponseDto> {
    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can create reviews')
    }

    const review = await this.reviewsService.createReview(
      mentorId,
      user.id,
      dto
    )

    // Load student relation
    const reviewWithStudent = await this.reviewsService.getMyReview(
      mentorId,
      user.id
    )

    return plainToInstance(
      MentorReviewResponseDto,
      reviewWithStudent || review,
      {
        excludeExtraneousValues: true
      }
    )
  }

  @Get(':mentorId/reviews')
  @Public()
  @ApiOperation({ summary: 'Get all reviews for a mentor (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of reviews with statistics'
  })
  async getReviews(
    @Param('mentorId', ParseUUIDPipe) mentorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<{
    reviews: MentorReviewResponseDto[]
    stats: MentorReviewStatsDto
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }> {
    const pageNum = page ? parseInt(page, 10) : 1
    const limitNum = limit ? parseInt(limit, 10) : 20

    const { reviews, total, averageRating, ratingDistribution } =
      await this.reviewsService.getReviewsByMentor(mentorId, pageNum, limitNum)

    const reviewsDto = reviews.map((review) =>
      plainToInstance(MentorReviewResponseDto, review, {
        excludeExtraneousValues: true
      })
    )

    return {
      reviews: reviewsDto,
      stats: {
        averageRating,
        totalReviews: total,
        ratingDistribution
      },
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }
  }

  @Get(':mentorId/reviews/my')
  @ApiOperation({ summary: 'Get my review for a mentor' })
  @ApiResponse({
    status: 200,
    description: 'My review for this mentor',
    type: MentorReviewResponseDto
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async getMyReview(
    @Param('mentorId', ParseUUIDPipe) mentorId: string,
    @CurrentUser() user: User
  ): Promise<MentorReviewResponseDto | null> {
    const review = await this.reviewsService.getMyReview(mentorId, user.id)

    if (!review) {
      return null
    }

    return plainToInstance(MentorReviewResponseDto, review, {
      excludeExtraneousValues: true
    })
  }

  @Get(':mentorId/reviews/stats')
  @ApiOperation({ summary: 'Get review statistics for a mentor' })
  @ApiResponse({
    status: 200,
    description: 'Review statistics',
    type: MentorReviewStatsDto
  })
  async getReviewStats(
    @Param('mentorId', ParseUUIDPipe) mentorId: string
  ): Promise<MentorReviewStatsDto> {
    const stats = await this.reviewsService.getReviewStats(mentorId)

    return plainToInstance(MentorReviewStatsDto, stats, {
      excludeExtraneousValues: true
    })
  }

  @Patch(':mentorId/reviews/:reviewId')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Update my review for a mentor' })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully',
    type: MentorReviewResponseDto
  })
  @ApiResponse({ status: 403, description: 'Can only update your own reviews' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async updateReview(
    @Param('mentorId', ParseUUIDPipe) mentorId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateMentorReviewDto
  ): Promise<MentorReviewResponseDto> {
    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can update reviews')
    }

    const review = await this.reviewsService.updateReview(
      reviewId,
      user.id,
      dto
    )

    // Load student relation
    const reviewWithStudent = await this.reviewsService.getMyReview(
      mentorId,
      user.id
    )

    return plainToInstance(
      MentorReviewResponseDto,
      reviewWithStudent || review,
      {
        excludeExtraneousValues: true
      }
    )
  }

  @Delete(':mentorId/reviews/:reviewId')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Delete my review for a mentor' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 403, description: 'Can only delete your own reviews' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async deleteReview(
    @Param('mentorId', ParseUUIDPipe) mentorId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUser() user: User
  ): Promise<{ success: boolean; message: string }> {
    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can delete reviews')
    }

    await this.reviewsService.deleteReview(reviewId, user.id)

    return {
      success: true,
      message: 'Review deleted successfully'
    }
  }
}
