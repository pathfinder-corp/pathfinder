import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique
} from 'typeorm'

import { User } from '../../users/entities/user.entity'
import { Roadmap } from './roadmap.entity'

@Entity('roadmap_shares')
@Unique('UQ_roadmap_shares_roadmap_user', ['roadmapId', 'sharedWithUserId'])
export class RoadmapShare {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'roadmap_id', type: 'uuid' })
  roadmapId!: string

  @ManyToOne(() => Roadmap, (roadmap) => roadmap.shares, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'roadmap_id' })
  roadmap!: Roadmap

  @Column({ name: 'shared_with_user_id', type: 'uuid' })
  sharedWithUserId!: string

  @ManyToOne(() => User, (user) => user.sharedRoadmaps, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'shared_with_user_id' })
  sharedWith!: User

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
