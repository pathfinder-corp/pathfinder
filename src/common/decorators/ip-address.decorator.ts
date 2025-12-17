import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'

import { IpUtil } from '../utils/ip.util'

/**
 * Parameter decorator to extract client IP address from the request
 * Usage: @IpAddress() ip: string
 */
export const IpAddress = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>()
    return IpUtil.extractIp(request)
  }
)
