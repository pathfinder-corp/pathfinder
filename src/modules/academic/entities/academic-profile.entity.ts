import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { User } from '../../users/entities/user.entity'

export enum EducationLevel {
  HIGH_SCHOOL = 'high_school',
  UNDERGRADUATE = 'undergraduate',
  GRADUATE = 'graduate',
  POSTGRADUATE = 'postgraduate'
}

@Entity('academic_profiles')
export class AcademicProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  userId: string

  @OneToOne(() => User, (user) => user.academicProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({
    type: 'enum',
    enum: EducationLevel
  })
  currentLevel: EducationLevel

  @Column({ nullable: true })
  currentGrade?: string

  @Column({ nullable: true })
  institution?: string

  @Column({ nullable: true })
  major?: string

  @Column({ nullable: true })
  minor?: string

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  gpa?: number

  @Column({ type: 'text', array: true, default: [] })
  achievements: string[]

  @Column({ type: 'text', array: true, default: [] })
  certifications: string[]

  @Column({ type: 'text', array: true, default: [] })
  academicInterests: string[]

  @Column({ type: 'text', array: true, default: [] })
  subjectStrengths: string[]

  @Column({ type: 'text', array: true, default: [] })
  subjectsNeedImprovement: string[]

  @Column({ nullable: true })
  intendedMajor?: string

  @Column({ nullable: true })
  targetUniversity?: string

  @Column({ type: 'text', array: true, default: [] })
  extracurricularActivities: string[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}