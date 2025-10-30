import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { Enrollment } from './enrollment.entity'

export enum CourseCategory {
  MATH = 'math',
  SCIENCE = 'science',
  TECHNOLOGY = 'technology',
  ENGINEERING = 'engineering',
  BUSINESS = 'business',
  ARTS = 'arts',
  HUMANITIES = 'humanities',
  LANGUAGE = 'language',
  SOCIAL_SCIENCE = 'social_science',
  OTHER = 'other'
}

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ type: 'text' })
  description: string

  @Column({
    type: 'enum',
    enum: CourseCategory
  })
  category: CourseCategory

  @Column({
    type: 'enum',
    enum: CourseLevel
  })
  level: CourseLevel

  @Column({ type: 'int', default: 0 })
  credits: number

  @Column({ type: 'text', array: true, default: [] })
  prerequisites: string[]

  @Column({ type: 'text', array: true, default: [] })
  skills: string[]

  @Column({ type: 'int', nullable: true })
  durationHours?: number

  @Column({ nullable: true })
  provider?: string

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating?: number

  @Column({ type: 'text', nullable: true })
  thumbnail?: string

  @Column({ default: true })
  isActive: boolean

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

