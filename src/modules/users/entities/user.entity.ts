import { Exclude } from 'class-transformer'
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

export enum UserRole {
  STUDENT = 'student',
  COUNSELOR = 'counselor',
  ADMIN = 'admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column()
  @Exclude()
  password: string

  @Column()
  firstName: string

  @Column()
  lastName: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT
  })
  role: UserRole

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE
  })
  status: UserStatus

  @Column({ nullable: true })
  avatar?: string

  @Column({ nullable: true })
  phone?: string

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date

  @Column({ nullable: true })
  location?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ nullable: true })
  lastLoginAt?: Date

  @Column({ nullable: true })
  lastLogoutAt?: Date
}