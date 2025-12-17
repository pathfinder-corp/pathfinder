import { createHash } from 'crypto'
import { Request } from 'express'

export class IpUtil {
  /**
   * Extract client IP address from request
   * Checks X-Forwarded-For, X-Real-IP, and req.ip in order
   */
  static extractIp(request: Request): string {
    // Check X-Forwarded-For header (for proxies/load balancers)
    const forwardedFor = request.headers['x-forwarded-for']
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
      return ips.split(',')[0].trim()
    }

    // Check X-Real-IP header
    const realIp = request.headers['x-real-ip']
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp
    }

    // Fallback to req.ip
    return request.ip || 'unknown'
  }

  /**
   * Hash IP address with salt for privacy compliance (GDPR)
   * Uses SHA-256 algorithm
   */
  static hashIp(ip: string, salt: string): string {
    if (!ip || ip === 'unknown') {
      return 'unknown'
    }

    return createHash('sha256')
      .update(ip + salt)
      .digest('hex')
  }
}
