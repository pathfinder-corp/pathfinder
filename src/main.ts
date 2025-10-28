import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global prefix
  app.setGlobalPrefix('api')

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  )

  // CORS
  app.enableCors()

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Pathfinder API')
    .setDescription('AI-Powered Academic and Career Pathway Recommendation System')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 8000
  await app.listen(port)

  console.log(`Application is running on: http://localhost:${port}`)
  console.log(`Swagger docs: http://localhost:${port}/api/docs`)
}

void bootstrap()