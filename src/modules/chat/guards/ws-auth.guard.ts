import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'

import { JwtPayload } from '../../auth/strategies/jwt.strategy'
import { UserStatus } from '../../users/entities/user.entity'
import { UsersService } from '../../users/users.service'

export interface AuthenticatedSocket extends Socket {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    avatar?: string
  }
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>()

    try {
      const user = await this.validateToken(client)
      ;(client as AuthenticatedSocket).user = user
      return true
    } catch {
      throw new WsException('Unauthorized')
    }
  }

  async validateToken(client: Socket): Promise<AuthenticatedSocket['user']> {
    // Try to get token from handshake auth or query
    const authToken = client.handshake.auth?.token as string | undefined
    const headerToken = client.handshake.headers?.authorization?.replace(
      'Bearer ',
      ''
    )
    const queryToken = client.handshake.query?.token as string | undefined

    const token = authToken ?? headerToken ?? queryToken

    if (!token) {
      throw new WsException('No token provided')
    }

    try {
      const secret = this.configService.getOrThrow<string>('jwt.secret')
      const payload = this.jwtService.verify<JwtPayload>(token, { secret })

      const user = await this.usersService.findOne(payload.sub)

      if (!user) {
        throw new WsException('User not found')
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new WsException('User account is not active')
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar
      }
    } catch {
      throw new WsException('Invalid token')
    }
  }
}
