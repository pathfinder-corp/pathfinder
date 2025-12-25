import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn
} from 'typeorm'

@Entity('genai_api_usage')
@Index(['serviceName', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['success', 'createdAt'])
@Index(['modelName', 'createdAt'])
export class GenAIApiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'service_name', length: 100 })
  serviceName: string

  @Column({ length: 100 })
  operation: string

  @Column({ name: 'model_name', length: 100 })
  modelName: string

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null

  @Column({ name: 'input_tokens', type: 'int', nullable: true })
  inputTokens: number | null

  @Column({ name: 'output_tokens', type: 'int', nullable: true })
  outputTokens: number | null

  @Column({ name: 'total_tokens', type: 'int', nullable: true })
  totalTokens: number | null

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null

  @Column({ type: 'boolean', default: true })
  success: boolean

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
