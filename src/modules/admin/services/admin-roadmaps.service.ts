import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { plainToInstance } from 'class-transformer'
import { Repository } from 'typeorm'

import { RoadmapShare } from '../../roadmaps/entities/roadmap-share.entity'
import { Roadmap } from '../../roadmaps/entities/roadmap.entity'
import {
  AdminRoadmapDetailResponseDto,
  AdminRoadmapQueryDto,
  AdminRoadmapResponseDto,
  RoadmapOwnerDto
} from '../dto/admin-roadmap.dto'
import { PaginatedResponseDto } from '../dto/pagination.dto'

@Injectable()
export class AdminRoadmapsService {
  constructor(
    @InjectRepository(Roadmap)
    private readonly roadmapsRepository: Repository<Roadmap>,
    @InjectRepository(RoadmapShare)
    private readonly roadmapSharesRepository: Repository<RoadmapShare>
  ) {}

  async findAll(
    query: AdminRoadmapQueryDto
  ): Promise<PaginatedResponseDto<AdminRoadmapResponseDto>> {
    const qb = this.roadmapsRepository
      .createQueryBuilder('roadmap')
      .leftJoinAndSelect('roadmap.user', 'user')

    if (query.userId) {
      qb.andWhere('roadmap.userId = :userId', { userId: query.userId })
    }

    if (query.topic) {
      qb.andWhere('roadmap.topic ILIKE :topic', { topic: `%${query.topic}%` })
    }

    if (query.isSharedWithAll !== undefined) {
      qb.andWhere('roadmap.isSharedWithAll = :isSharedWithAll', {
        isSharedWithAll: query.isSharedWithAll
      })
    }

    const sortField = query.sortBy || 'createdAt'
    const allowedSortFields = ['createdAt', 'updatedAt', 'topic']

    if (allowedSortFields.includes(sortField)) {
      qb.orderBy(`roadmap.${sortField}`, query.sortOrder || 'DESC')
    } else {
      qb.orderBy('roadmap.createdAt', 'DESC')
    }

    const [roadmaps, total] = await qb
      .skip(query.skip)
      .take(query.take)
      .getManyAndCount()

    const data = roadmaps.map((roadmap) => this.toResponseDto(roadmap))

    return new PaginatedResponseDto(
      data,
      total,
      query.page ?? 1,
      query.limit ?? 20
    )
  }

  async findOne(id: string): Promise<AdminRoadmapDetailResponseDto> {
    const roadmap = await this.roadmapsRepository.findOne({
      where: { id },
      relations: ['user']
    })

    if (!roadmap) {
      throw new NotFoundException(`Roadmap with ID ${id} not found`)
    }

    const shareCount = await this.roadmapSharesRepository.count({
      where: { roadmapId: id }
    })

    return plainToInstance(
      AdminRoadmapDetailResponseDto,
      {
        id: roadmap.id,
        topic: roadmap.topic,
        experienceLevel: roadmap.experienceLevel,
        learningPace: roadmap.learningPace,
        timeframe: roadmap.timeframe,
        isSharedWithAll: roadmap.isSharedWithAll,
        summary: roadmap.summary,
        phases: roadmap.phases,
        milestones: roadmap.milestones,
        createdAt: roadmap.createdAt,
        updatedAt: roadmap.updatedAt,
        owner: this.toOwnerDto(roadmap.user),
        shareCount
      },
      { excludeExtraneousValues: true }
    )
  }

  async remove(id: string): Promise<void> {
    const result = await this.roadmapsRepository.delete(id)

    if (!result.affected) {
      throw new NotFoundException(`Roadmap with ID ${id} not found`)
    }
  }

  private toResponseDto(roadmap: Roadmap): AdminRoadmapResponseDto {
    return plainToInstance(
      AdminRoadmapResponseDto,
      {
        id: roadmap.id,
        topic: roadmap.topic,
        experienceLevel: roadmap.experienceLevel,
        learningPace: roadmap.learningPace,
        timeframe: roadmap.timeframe,
        isSharedWithAll: roadmap.isSharedWithAll,
        createdAt: roadmap.createdAt,
        updatedAt: roadmap.updatedAt,
        owner: this.toOwnerDto(roadmap.user)
      },
      { excludeExtraneousValues: true }
    )
  }

  private toOwnerDto(user: Roadmap['user']): RoadmapOwnerDto {
    return plainToInstance(
      RoadmapOwnerDto,
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar
      },
      { excludeExtraneousValues: true }
    )
  }
}
