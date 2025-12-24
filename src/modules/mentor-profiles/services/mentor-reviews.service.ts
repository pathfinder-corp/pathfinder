import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Mentorship } from '../../mentorships/entities/mentorship.entity'
import { User, UserRole } from '../../users/entities/user.entity'
import { CreateMentorReviewDto } from '../dto/create-review.dto'
import { UpdateMentorReviewDto } from '../dto/update-review.dto'
import { MentorProfile } from '../entities/mentor-profile.entity'
import { MentorReview } from '../entities/mentor-review.entity'

@Injectable()
export class MentorReviewsService {
  private readonly logger = new Logger(MentorReviewsService.name)

  constructor(
    @InjectRepository(MentorReview)
    private readonly reviewRepository: Repository<MentorReview>,
    @InjectRepository(Mentorship)
    private readonly mentorshipRepository: Repository<Mentorship>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MentorProfile)
    private readonly mentorProfileRepository: Repository<MentorProfile>
  ) {}

  async createReview(
    mentorId: string,
    studentId: string,
    dto: CreateMentorReviewDto
  ): Promise<MentorReview> {
    // Resolve mentorId (could be profile ID or user ID)
    const actualMentorId = await this.resolveMentorId(mentorId)

    // Validate mentor exists and is actually a mentor
    const mentor = await this.userRepository.findOne({
      where: { id: actualMentorId }
    })

    if (!mentor) {
      throw new NotFoundException('Mentor not found')
    }

    if (mentor.role !== UserRole.MENTOR) {
      throw new BadRequestException('The specified user is not a mentor')
    }

    // Check if student already reviewed this mentor
    const existingReview = await this.reviewRepository.findOne({
      where: {
        mentorId: actualMentorId,
        studentId
      }
    })

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this mentor. Use update endpoint to modify your review.'
      )
    }

    // REQUIRED: Check if there's at least one mentorship (active or ended) between student and mentor
    let mentorship: Mentorship | null = null

    if (dto.mentorshipId) {
      // If mentorshipId is provided, verify it exists and student is part of it
      mentorship = await this.mentorshipRepository.findOne({
        where: {
          id: dto.mentorshipId,
          studentId,
          mentorId: actualMentorId
        }
      })

      if (!mentorship) {
        throw new NotFoundException(
          'Mentorship not found or you are not part of it'
        )
      }
    } else {
      // If no mentorshipId provided, check if there's any mentorship (active or ended)
      mentorship = await this.mentorshipRepository.findOne({
        where: {
          mentorId: actualMentorId,
          studentId
          // No status filter - allow both ACTIVE and CANCELLED
        }
      })

      if (!mentorship) {
        throw new BadRequestException(
          'You must have at least one mentorship (active or ended) with this mentor before you can review them'
        )
      }
    }

    const review = this.reviewRepository.create({
      mentorId: actualMentorId,
      studentId,
      rating: dto.rating,
      feedback: dto.feedback,
      mentorshipId: dto.mentorshipId
    })

    const saved = await this.reviewRepository.save(review)

    this.logger.log(
      `Review created: ${saved.id} by student ${studentId} for mentor ${actualMentorId} (rating: ${dto.rating})`
    )

    return saved
  }

  async updateReview(
    reviewId: string,
    studentId: string,
    dto: UpdateMentorReviewDto
  ): Promise<MentorReview> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId }
    })

    if (!review) {
      throw new NotFoundException('Review not found')
    }

    if (review.studentId !== studentId) {
      throw new ForbiddenException('You can only update your own reviews')
    }

    if (dto.rating !== undefined) {
      review.rating = dto.rating
    }

    if (dto.feedback !== undefined) {
      review.feedback = dto.feedback
    }

    const updated = await this.reviewRepository.save(review)

    this.logger.log(`Review updated: ${reviewId} by student ${studentId}`)

    return updated
  }

  async getMyReview(
    mentorId: string,
    studentId: string
  ): Promise<MentorReview | null> {
    // Resolve mentorId (could be profile ID or user ID)
    const actualMentorId = await this.resolveMentorId(mentorId)

    return this.reviewRepository.findOne({
      where: {
        mentorId: actualMentorId,
        studentId
      },
      relations: ['student']
    })
  }

  private async resolveMentorId(mentorId: string): Promise<string> {
    // First try as user ID
    const mentor = await this.userRepository.findOne({
      where: { id: mentorId }
    })

    if (mentor && mentor.role === UserRole.MENTOR) {
      return mentorId
    }

    // If not found as user ID, try as profile ID
    const profile = await this.mentorProfileRepository.findOne({
      where: { id: mentorId },
      relations: ['user']
    })

    if (profile && profile.user && profile.user.role === UserRole.MENTOR) {
      return profile.userId
    }

    // If still not found, return original (will fail with proper error later)
    return mentorId
  }

  async getReviewsByMentor(
    mentorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    reviews: MentorReview[]
    total: number
    averageRating: number
    ratingDistribution: {
      5: number
      4: number
      3: number
      2: number
      1: number
    }
  }> {
    // Resolve mentorId (could be profile ID or user ID)
    const actualMentorId = await this.resolveMentorId(mentorId)

    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { mentorId: actualMentorId },
      relations: ['student'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit
    })

    // Calculate average rating and distribution
    const allReviews = await this.reviewRepository.find({
      where: { mentorId: actualMentorId },
      select: ['rating']
    })

    const averageRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0

    const ratingDistribution = {
      5: allReviews.filter((r) => r.rating === 5).length,
      4: allReviews.filter((r) => r.rating === 4).length,
      3: allReviews.filter((r) => r.rating === 3).length,
      2: allReviews.filter((r) => r.rating === 2).length,
      1: allReviews.filter((r) => r.rating === 1).length
    }

    return {
      reviews,
      total,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      ratingDistribution
    }
  }

  async getReviewStats(mentorId: string): Promise<{
    averageRating: number
    totalReviews: number
    ratingDistribution: {
      5: number
      4: number
      3: number
      2: number
      1: number
    }
  }> {
    // Resolve mentorId (could be profile ID or user ID)
    const actualMentorId = await this.resolveMentorId(mentorId)

    const reviews = await this.reviewRepository.find({
      where: { mentorId: actualMentorId },
      select: ['rating']
    })

    const totalReviews = reviews.length

    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      }
    }

    const averageRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews

    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length
    }

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution
    }
  }

  async deleteReview(reviewId: string, studentId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId }
    })

    if (!review) {
      throw new NotFoundException('Review not found')
    }

    if (review.studentId !== studentId) {
      throw new ForbiddenException('You can only delete your own reviews')
    }

    await this.reviewRepository.remove(review)

    this.logger.log(`Review deleted: ${reviewId} by student ${studentId}`)
  }
}
