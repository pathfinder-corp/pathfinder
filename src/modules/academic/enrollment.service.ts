import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CourseService } from './course.service'
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity'

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly courseService: CourseService
  ) {}

  async enroll(userId: string, courseId: string): Promise<Enrollment> {
    await this.courseService.findOne(courseId)

    const existing = await this.enrollmentRepository.findOne({
      where: {
        userId,
        courseId,
        status: EnrollmentStatus.IN_PROGRESS
      }
    })

    if (existing) {
      throw new BadRequestException('Already enrolled in this course')
    }

    const enrollment = this.enrollmentRepository.create({
      userId,
      courseId,
      status: EnrollmentStatus.IN_PROGRESS
    })

    return await this.enrollmentRepository.save(enrollment)
  }

  async findByUser(userId: string): Promise<Enrollment[]> {
    return await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
      order: { createdAt: 'DESC' }
    })
  }

  async findOne(id: string, userId: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id, userId },
      relations: ['course']
    })

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found')
    }

    return enrollment
  }

  async updateProgress(
    id: string,
    userId: string,
    progress: number
  ): Promise<Enrollment> {
    const enrollment = await this.findOne(id, userId)

    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100')
    }

    enrollment.progress = progress

    if (progress === 100 && enrollment.status !== EnrollmentStatus.COMPLETED) {
      enrollment.status = EnrollmentStatus.COMPLETED
      enrollment.completedAt = new Date()
    }

    return await this.enrollmentRepository.save(enrollment)
  }

  async drop(id: string, userId: string): Promise<void> {
    const enrollment = await this.findOne(id, userId)

    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot drop a completed course')
    }

    enrollment.status = EnrollmentStatus.DROPPED
    await this.enrollmentRepository.save(enrollment)
  }

  async getStats(userId: string): Promise<{
    total: number
    inProgress: number
    completed: number
    dropped: number
  }> {
    const enrollments = await this.findByUser(userId)

    return {
      total: enrollments.length,
      inProgress: enrollments.filter(
        (e) => e.status === EnrollmentStatus.IN_PROGRESS
      ).length,
      completed: enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED)
        .length,
      dropped: enrollments.filter((e) => e.status === EnrollmentStatus.DROPPED)
        .length
    }
  }
}

