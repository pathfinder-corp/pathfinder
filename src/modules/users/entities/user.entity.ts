import { Exclude } from 'class-transformer'
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

import { AssessmentShare } from '../../assessments/entities/assessment-share.entity'
import { Assessment } from '../../assessments/entities/assessment.entity'
import { RoadmapShare } from '../../roadmaps/entities/roadmap-share.entity'
import { Roadmap } from '../../roadmaps/entities/roadmap.entity'

export enum UserRole {
  STUDENT = 'student',
  MENTOR = 'mentor',
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

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ nullable: true })
  lastLoginAt?: Date

  @Column({ nullable: true })
  lastLogoutAt?: Date

  @OneToMany(() => Roadmap, (roadmap) => roadmap.user)
  roadmaps?: Roadmap[]

  @OneToMany(() => RoadmapShare, (share) => share.sharedWith)
  sharedRoadmaps?: RoadmapShare[]

  @OneToMany(() => Assessment, (assessment) => assessment.user)
  assessments?: Assessment[]

  @OneToMany(() => AssessmentShare, (share) => share.sharedWith)
  sharedAssessments?: AssessmentShare[]
}
