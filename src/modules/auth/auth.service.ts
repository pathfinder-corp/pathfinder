import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { Repository } from 'typeorm'
import { MailService } from '../mail/mail.service'
import { PasswordResetToken } from '../users/entities/password-reset-token.entity'
import { UsersService } from '../users/users.service'
import { AuthResponseDto } from './dto/auth-response.dto'
import { ForgotPasswordDto } from '../users/dto/forgot-password.dto'
import { ResetPasswordDto } from '../users/dto/reset-password.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtPayload } from './strategies/jwt.strategy'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(registerDto)

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    }

    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '7d',
      user
    }
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

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active')
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    }

    const accessToken = this.jwtService.sign(payload)

    user.lastLoginAt = new Date()
    await this.usersService.update(user.id, { lastLoginAt: user.lastLoginAt } as any)

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '7d',
      user
    }
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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto

    const user = await this.usersService.findByEmail(email)

    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent'
      }
    }

    const resetToken = randomUUID()

    const expiryMinutes = this.configService.get<number>('passwordResetTokenExpiry') || 60
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
        user.firstName
      )
    } catch (error) {
      console.error('Failed to send password reset email:', error)
    }

    return {
      message: 'If the email exists, a password reset link has been sent'
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
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

    if (resetToken.user.status !== 'active') {
      throw new BadRequestException('User account is not active')
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await this.usersService.update(resetToken.userId, {
      password: hashedPassword
    } as any)

    resetToken.used = true
    await this.passwordResetTokenRepository.save(resetToken)

    try {
      await this.mailService.sendPasswordResetSuccessEmail(
        resetToken.user.email,
        resetToken.user.firstName
      )
    } catch (error) {
      console.error('Failed to send success email:', error)
    }

    return {
      message: 'Password has been reset successfully'
    }
  }

  async validateUser(userId: string) {
    return await this.usersService.findOne(userId)
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; message?: string }> {
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
}