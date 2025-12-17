import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { Assessment } from '../../assessments/entities/assessment.entity'
import { Roadmap } from '../../roadmaps/entities/roadmap.entity'
import { User, UserRole } from '../../users/entities/user.entity'
import {
  AdminUpdateUserDto,
  AdminUserDetailResponseDto,
  AdminUserQueryDto,
  AdminUserResponseDto
} from '../dto/admin-user.dto'
import { PaginatedResponseDto } from '../dto/pagination.dto'

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Roadmap)
    private readonly roadmapsRepository: Repository<Roadmap>,
    @InjectRepository(Assessment)
    private readonly assessmentsRepository: Repository<Assessment>
  ) {}

  async findAll(
    query: AdminUserQueryDto
  ): Promise<PaginatedResponseDto<AdminUserResponseDto>> {
    const qb = this.usersRepository.createQueryBuilder('user')

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role })
    }

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status })
    }

    if (query.search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${query.search}%` }
      )
    }

    const sortField = query.sortBy || 'createdAt'
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'email',
      'firstName',
      'lastName',
      'role',
      'status'
    ]

    if (allowedSortFields.includes(sortField)) {
      qb.orderBy(`user.${sortField}`, query.sortOrder || 'DESC')
    } else {
      qb.orderBy('user.createdAt', 'DESC')
    }

    const [users, total] = await qb
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    const data = users.map((user) =>
      plainToInstance(AdminUserResponseDto, user, {
        excludeExtraneousValues: true
      })
    )

    return new PaginatedResponseDto(
      data,
      total,
      query.page ?? 1,
      query.limit ?? 20
    )
  }

  async findOne(id: string): Promise<AdminUserDetailResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    const [roadmapCount, assessmentCount] = await Promise.all([
      this.roadmapsRepository.count({ where: { userId: id } }),
      this.assessmentsRepository.count({ where: { userId: id } })
    ])

    return plainToInstance(
      AdminUserDetailResponseDto,
      {
        ...user,
        roadmapCount,
        assessmentCount
      },
      { excludeExtraneousValues: true }
    )
  }

  async update(
    id: string,
    updateDto: AdminUpdateUserDto,
    currentUser: User
  ): Promise<AdminUserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    // Prevent modifying admin users' role or status
    if (user.role === UserRole.ADMIN) {
      if (updateDto.role !== undefined) {
        throw new ForbiddenException('Cannot modify admin user roles')
      }
      if (updateDto.status !== undefined) {
        throw new ForbiddenException('Cannot modify admin user status')
      }
    }

    if (updateDto.role !== undefined) {
      user.role = updateDto.role
    }

    if (updateDto.status !== undefined) {
      user.status = updateDto.status
    }

    const updatedUser = await this.usersRepository.save(user)

    return plainToInstance(AdminUserResponseDto, updatedUser, {
      excludeExtraneousValues: true
    })
  }

  async remove(id: string): Promise<void> {
    // Check if user exists and get their role before deleting
    const user = await this.usersRepository.findOne({ where: { id } })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    // Prevent deleting admin users
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot delete admin users')
    }

    await this.usersRepository.delete(id)
  }
}
