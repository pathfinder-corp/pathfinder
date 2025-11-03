import { ConfigService } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'

export const getDatabaseConfig = (
  configService: ConfigService
): TypeOrmModuleOptions => {
  const nodeEnv = configService.get<string>('nodeEnv') ?? 'development'
  const isProduction = nodeEnv === 'production'
  const synchronize =
    configService.get<boolean>('database.synchronize') ?? false
  const logging =
    configService.get<boolean>('database.logging') ?? nodeEnv !== 'production'
  const useSsl = configService.get<boolean>('database.ssl') ?? false
  const rejectUnauthorized =
    configService.get<boolean>('database.sslRejectUnauthorized') ?? false

  if (isProduction && synchronize) {
    throw new Error(
      'DATABASE_SYNCHRONIZE must be disabled in production environments.'
    )
  }

  return {
    type: 'postgres',
    host: configService.getOrThrow<string>('database.host'),
    port: configService.getOrThrow<number>('database.port'),
    username: configService.getOrThrow<string>('database.username'),
    password: configService.getOrThrow<string>('database.password'),
    database: configService.getOrThrow<string>('database.database'),
    autoLoadEntities: true,
    synchronize,
    logging,
    ssl: useSsl
      ? {
          rejectUnauthorized
        }
      : false,
    migrations: ['dist/migrations/*.js'],
    migrationsRun: false
  }
}
