import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuditLog } from './entities/audit-log.entity'
import { AuditLogService } from './services/audit-log.service'
import { ImageKitService } from './services/imagekit.service'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLogService, ImageKitService],
  exports: [AuditLogService, ImageKitService]
})
export class CommonModule {}
