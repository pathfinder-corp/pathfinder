import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHealth() {
    return {
      status: 'ok',
      environment: this.configService.get<string>('nodeEnv') ?? 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  }
}
