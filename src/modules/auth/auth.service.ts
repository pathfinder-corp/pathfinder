import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { plainToInstance } from 'class-transformer'
import { randomUUID } from 'crypto'
import { Repository } from 'typeorm'

import { MailService } from '../mail/mail.service'
import { ForgotPasswordDto } from '../users/dto/forgot-password.dto'
import { ResetPasswordDto } from '../users/dto/reset-password.dto'
import { UserResponseDto } from '../users/dto/user-response.dto'
import { PasswordResetToken } from '../users/entities/password-reset-token.entity'
import { User, UserStatus } from '../users/entities/user.entity'
import { UsersService } from '../users/users.service'
import { AuthResponseDto } from './dto/auth-response.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { EmailVerificationToken } from './entities/email-verification-token.entity'
import { JwtPayload } from './strategies/jwt.strategy'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(registerDto)

    // Send verification email
    await this.sendVerificationEmail(user.id)

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    }

    const accessToken = this.jwtService.sign(payload)

    return this.buildAuthResponse(user, accessToken)
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email)

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password
    )

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active')
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    }

    const accessToken = this.jwtService.sign(payload)

    user.lastLoginAt = new Date()
    await this.usersService.update(user.id, {
      lastLoginAt: user.lastLoginAt
    } as any)

    return this.buildAuthResponse(user, accessToken)
  }

  async logout(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId)

    if (user) {
      await this.usersService.update(userId, {
        lastLogoutAt: new Date()
      } as any)
    }

    return {
      message: 'Logged out successfully'
    }
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto

    const user = await this.usersService.findByEmail(email)

    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent'
      }
    }

    const resetToken = randomUUID()

    const expiryMinutes =
      this.configService.get<number>('passwordResetTokenExpiry') || 60
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes)

    await this.passwordResetTokenRepository.delete({
      userId: user.id,
      used: false
    })

    const passwordResetToken = this.passwordResetTokenRepository.create({
      token: resetToken,
      userId: user.id,
      expiresAt,
      used: false
    })

    await this.passwordResetTokenRepository.save(passwordResetToken)

    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName,
        expiryMinutes
      )
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error('Failed to send password reset email', error.stack)
      } else {
        this.logger.error(
          `Failed to send password reset email: ${JSON.stringify(error)}`
        )
      }
    }

    return {
      message: 'If the email exists, a password reset link has been sent'
    }
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user']
    })

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token')
    }

    if (resetToken.used) {
      throw new BadRequestException('Reset token has already been used')
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Reset token has expired')
    }

    if (resetToken.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('User account is not active')
    }

    await this.usersService.update(resetToken.userId, {
      password: newPassword
    })

    resetToken.used = true
    await this.passwordResetTokenRepository.save(resetToken)

    try {
      await this.mailService.sendPasswordResetSuccessEmail(
        resetToken.user.email,
        resetToken.user.firstName
      )
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          'Failed to send password reset success email',
          error.stack
        )
      } else {
        this.logger.error(
          `Failed to send password reset success email: ${JSON.stringify(error)}`
        )
      }
    }

    return {
      message: 'Password has been reset successfully'
    }
  }

  async validateUser(userId: string) {
    return await this.usersService.findOne(userId)
  }

  async verifyResetToken(
    token: string
  ): Promise<{ valid: boolean; message?: string }> {
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token }
    })

    if (!resetToken) {
      return { valid: false, message: 'Invalid reset token' }
    }

    if (resetToken.used) {
      return { valid: false, message: 'Reset token has already been used' }
    }

    if (new Date() > resetToken.expiresAt) {
      return { valid: false, message: 'Reset token has expired' }
    }

    return { valid: true }
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.usersService.findOne(userId)

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified')
    }

    // Generate verification token
    const token = randomUUID()
    const expiryHours = this.configService.get<number>(
      'emailVerification.tokenExpiryHours',
      24
    )
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiryHours)

    // Save token to database
    const verificationToken = this.emailVerificationTokenRepository.create({
      userId,
      token,
      expiresAt
    })
    await this.emailVerificationTokenRepository.save(verificationToken)

    // Update user with token info
    await this.userRepository.update(userId, {
      emailVerificationToken: token,
      emailVerificationSentAt: new Date()
    })

    // Send email
    await this.mailService.sendEmailVerification(
      user.email,
      token,
      user.firstName
    )

    this.logger.log(`Email verification sent to user ${userId}`)
  }

  async verifyEmail(token: string): Promise<boolean> {
    const verificationToken =
      await this.emailVerificationTokenRepository.findOne({
        where: { token },
        relations: ['user']
      })

    if (!verificationToken) {
      throw new BadRequestException('Invalid verification token')
    }

    if (verificationToken.used) {
      throw new BadRequestException('Verification token already used')
    }

    if (new Date() > verificationToken.expiresAt) {
      throw new BadRequestException('Verification token expired')
    }

    // Mark token as used
    verificationToken.used = true
    await this.emailVerificationTokenRepository.save(verificationToken)

    // Update user
    await this.userRepository.update(verificationToken.userId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerificationToken: undefined
    })

    this.logger.log(`Email verified for user ${verificationToken.userId}`)
    return true
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.usersService.findOne(userId)

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified')
    }

    // Check if email was sent recently (prevent spam)
    if (user.emailVerificationSentAt) {
      const minutesSinceLastSent =
        (Date.now() - user.emailVerificationSentAt.getTime()) / 1000 / 60
      if (minutesSinceLastSent < 2) {
        throw new BadRequestException(
          'Please wait a few minutes before requesting another verification email'
        )
      }
    }

    // Invalidate old tokens
    await this.emailVerificationTokenRepository.update(
      { userId, used: false },
      { used: true }
    )

    // Send new verification email
    await this.sendVerificationEmail(userId)
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto
  ): Promise<User> {
    const user = await this.usersService.findOne(userId)

    if (updateProfileDto.firstName !== undefined) {
      user.firstName = updateProfileDto.firstName
    }

    if (updateProfileDto.lastName !== undefined) {
      user.lastName = updateProfileDto.lastName
    }

    return await this.userRepository.save(user)
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto
  ): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId)

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password
    )

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect')
    }

    await this.usersService.update(userId, {
      password: changePasswordDto.newPassword
    })

    return { message: 'Password changed successfully' }
  }

  private buildAuthResponse(user: User, accessToken: string): AuthResponseDto {
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '7d'
    const safeUser = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true
    })

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: safeUser
    }
  }
}
