import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'

import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email }
    })

    if (existingUser) throw new ConflictException('Email already exists')

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10)

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword
    })

    return await this.userRepository.save(user)
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find()
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } })
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id)

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10)
    }

    Object.assign(user, updateUserDto)

    return await this.userRepository.save(user)
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id)
    await this.userRepository.remove(user)
  }

  async searchByEmail(email: string): Promise<User[]> {
    const users = await this.userRepository.find({
      where: { email },
      select: ['id', 'email', 'firstName', 'lastName'],
      take: 50
    })

    return users
  }
}
