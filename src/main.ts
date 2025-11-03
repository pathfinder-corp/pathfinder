import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory, Reflector } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import compression from 'compression'
import helmet from 'helmet'

import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true
  })

  const configService = app.get(ConfigService)
  const reflector = app.get(Reflector)
  const logger = new Logger('Bootstrap')

  app.useLogger(logger)
  app.enableShutdownHooks()

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      stopAtFirstError: true,
      transformOptions: {
        enableImplicitConversion: true
      },
      validationError: {
        target: false
      }
    })
  )

  app.useGlobalFilters(new HttpExceptionFilter())

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector, {
      enableImplicitConversion: true
    })
  )

  app.setGlobalPrefix('api')

  const corsConfig = configService.get<{
    enabled?: boolean
    origins?: string[]
    credentials?: boolean
    methods?: string
    maxAge?: number
  }>('cors')

  if (corsConfig?.enabled !== false) {
    app.enableCors({
      origin:
        corsConfig?.origins && corsConfig.origins.length > 0
          ? corsConfig.origins
          : true,
      credentials: corsConfig?.credentials ?? true,
      methods: corsConfig?.methods,
      maxAge: corsConfig?.maxAge,
      allowedHeaders: [
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Requested-With'
      ],
      exposedHeaders: ['Content-Disposition']
    })
  }

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy:
        configService.get<string>('nodeEnv') === 'production'
          ? undefined
          : false
    })
  )

  app.use(compression())

  const documentation = configService.get<{
    enabled?: boolean
    path?: string
  }>('documentation')

  if (documentation?.enabled !== false) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Pathfinder API')
      .setDescription(
        'AI-Powered Academic and Career Pathway Recommendation System'
      )
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      })
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup(documentation?.path ?? 'api/docs', app, document, {
      customSiteTitle: 'Pathfinder API Documentation'
    })
  }

  const port = configService.get<number>('app.port') ?? 8000
  await app.listen(port)

  logger.log(`Application is running on port ${port}`)
}

void bootstrap()
