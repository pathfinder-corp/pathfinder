import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateAcademicProfileDto } from './dto/create-academic-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'
import { AcademicProfile } from './entities/academic-profile.entity'

@Injectable()
export class AcademicProfileService {
  constructor(
    @InjectRepository(AcademicProfile)
    private readonly profileRepository: Repository<AcademicProfile>
  ) {}

  async create(
    userId: string,
    createDto: CreateAcademicProfileDto
  ): Promise<AcademicProfile> {
    const existing = await this.profileRepository.findOne({
      where: { userId }
    })

    if (existing) {
      throw new ConflictException('Academic profile already exists')
    }

    const profile = this.profileRepository.create({
      userId,
      ...createDto
    })

    return await this.profileRepository.save(profile)
  }

  async findByUserId(userId: string): Promise<AcademicProfile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['user']
    })

    if (!profile) {
      throw new NotFoundException('Academic profile not found')
    }

    return profile
  }

  async update(
    userId: string,
    updateDto: UpdateAcademicProfileDto
  ): Promise<AcademicProfile> {
    const profile = await this.findByUserId(userId)

    Object.assign(profile, updateDto)

    return await this.profileRepository.save(profile)
  }

  async delete(userId: string): Promise<void> {
    const profile = await this.findByUserId(userId)
    await this.profileRepository.remove(profile)
  }

  async findAll(): Promise<AcademicProfile[]> {
    return await this.profileRepository.find({
      relations: ['user']
    })
  }
}

