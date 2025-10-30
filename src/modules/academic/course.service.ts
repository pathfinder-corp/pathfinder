import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateCourseDto } from './dto/create-course.dto'
import { Course, CourseCategory, CourseLevel } from './entities/course.entity'

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>
  ) {}

  async create(createDto: CreateCourseDto): Promise<Course> {
    const course = this.courseRepository.create(createDto)
    return await this.courseRepository.save(course)
  }

  async findAll(
    category?: CourseCategory,
    level?: CourseLevel,
    search?: string
  ): Promise<Course[]> {
    const query = this.courseRepository.createQueryBuilder('course')

    if (category) {
      query.andWhere('course.category = :category', { category })
    }

    if (level) {
      query.andWhere('course.level = :level', { level })
    }

    if (search) {
      query.andWhere(
        '(course.name ILIKE :search OR course.description ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    query.andWhere('course.isActive = :isActive', { isActive: true })

    return await query.orderBy('course.createdAt', 'DESC').getMany()
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id }
    })

    if (!course) {
      throw new NotFoundException('Course not found')
    }

    return course
  }

  async update(id: string, updateDto: Partial<CreateCourseDto>): Promise<Course> {
    const course = await this.findOne(id)

    Object.assign(course, updateDto)

    return await this.courseRepository.save(course)
  }

  async delete(id: string): Promise<void> {
    const course = await this.findOne(id)
    await this.courseRepository.remove(course)
  }

  async countByCategory(): Promise<{ category: string; count: number }[]> {
    return await this.courseRepository
      .createQueryBuilder('course')
      .select('course.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('course.isActive = :isActive', { isActive: true })
      .groupBy('course.category')
      .getRawMany()
  }
}

