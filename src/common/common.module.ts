import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuditLog } from './entities/audit-log.entity'
import { GenAIApiUsage } from './entities/genai-api-usage.entity'
import { AuditLogService } from './services/audit-log.service'
import { ImageKitService } from './services/imagekit.service'
import { GenAIKeyManagerService } from './services/genai-key-manager.service'
import { GenAIClientWrapperService } from './services/genai-client-wrapper.service'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, GenAIApiUsage])],
  providers: [
    AuditLogService,
    ImageKitService,
    GenAIKeyManagerService,
    GenAIClientWrapperService,
  ],
  exports: [
    AuditLogService,
    ImageKitService,
    GenAIKeyManagerService,
    GenAIClientWrapperService,
  ],
})
export class CommonModule {}
