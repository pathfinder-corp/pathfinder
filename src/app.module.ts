import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { CommonModule } from './common/common.module'
import appConfig from './config/app.config'
import { getDatabaseConfig } from './config/database.config'
import { envValidationSchema } from './config/env.validation'
import { AdminModule } from './modules/admin/admin.module'
import { AssessmentsModule } from './modules/assessments/assessments.module'
import { AuthModule } from './modules/auth/auth.module'
import { ChatModule } from './modules/chat/chat.module'
import { MailModule } from './modules/mail/mail.module'
import { MentorApplicationsModule } from './modules/mentor-applications/mentor-applications.module'
import { MentorProfilesModule } from './modules/mentor-profiles/mentor-profiles.module'
import { MentorshipRequestsModule } from './modules/mentorship-requests/mentorship-requests.module'
import { MentorshipsModule } from './modules/mentorships/mentorships.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { RecommendationsModule } from './modules/recommendations/recommendations.module'
import { RoadmapsModule } from './modules/roadmaps/roadmaps.module'
import { SchedulerModule } from './modules/scheduler/scheduler.module'
import { StudentPreferencesModule } from './modules/student-preferences/student-preferences.module'
import { UsersModule } from './modules/users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      envFilePath: ['.env', `.env.${process.env.NODE_ENV ?? 'development'}`],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false
      }
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('throttle.ttl') ?? 60,
          limit: configService.get<number>('throttle.limit') ?? 100
        }
      ]
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    UsersModule,
    AuthModule,
    MailModule,
    RoadmapsModule,
    AssessmentsModule,
    AdminModule,
    NotificationsModule,
    MentorApplicationsModule,
    MentorProfilesModule,
    StudentPreferencesModule,
    RecommendationsModule,
    MentorshipRequestsModule,
    MentorshipsModule,
    SchedulerModule,
    ChatModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
