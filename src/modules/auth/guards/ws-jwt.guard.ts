import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'

interface AuthenticatedSocket extends Socket {
  userId?: string
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>()
    const authToken = client.handshake.auth?.token as string | undefined
    const headerToken = client.handshake.headers?.authorization?.replace(
      'Bearer ',
      ''
    )
    const token: string | undefined = authToken || headerToken

    if (!token) {
      throw new WsException('Unauthorized')
    }

    try {
      const payload = await this.jwtService.verifyAsync(token)
      client.userId = payload.sub
      return true
    } catch (error) {
      throw new WsException('Unauthorized')
    }
  }
}
