import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MailModule } from '../mail/mail.module'
import { PasswordResetToken } from '../users/entities/password-reset-token.entity'
import { User } from '../users/entities/user.entity'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { EmailVerificationToken } from './entities/email-verification-token.entity'
import { RolesGuard } from './guards/roles.guard'
import { WsJwtGuard } from './guards/ws-jwt.guard'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
  imports: [
    UsersModule,
    MailModule,
    TypeOrmModule.forFeature([
      PasswordResetToken,
      EmailVerificationToken,
      User
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('jwt.secret')

        return {
          secret,
          signOptions: {
            expiresIn: '7d'
          }
        }
      }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, WsJwtGuard],
  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,
    RolesGuard,
    WsJwtGuard,
    JwtModule
  ]
})
export class AuthModule {}
