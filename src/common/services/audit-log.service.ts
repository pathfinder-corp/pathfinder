import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { AuditLog } from '../entities/audit-log.entity'

export interface AuditLogEntry {
  actorId: string | null
  action: string
  entityType: string
  entityId: string
  changes?: Record<string, any>
  metadata?: Record<string, any>
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name)

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>
  ) {}

  async log(entry: AuditLogEntry): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(entry)
    const saved = await this.auditLogRepository.save(auditLog)

    this.logger.log(
      `[AUDIT] ${entry.action} on ${entry.entityType}:${entry.entityId} by ${entry.actorId ?? 'system'}`
    )

    return saved
  }

  async logStateTransition(
    actorId: string | null,
    entityType: string,
    entityId: string,
    action: string,
    previousState: string | null,
    newState: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.log({
      actorId,
      action,
      entityType,
      entityId,
      changes: {
        previousState,
        newState
      },
      metadata
    })
  }

  async findByEntity(
    entityType: string,
    entityId: string
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      relations: ['actor']
    })
  }

  async findByActor(actorId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
      take: limit
    })
  }

  async findRecent(limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['actor']
    })
  }
}
