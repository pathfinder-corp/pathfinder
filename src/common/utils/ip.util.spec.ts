import { Request } from 'express'

import { IpUtil } from './ip.util'

describe('IpUtil', () => {
  describe('extractIp', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        },
        ip: '127.0.0.1'
      } as unknown as Request

      const result = IpUtil.extractIp(req)
      expect(result).toBe('192.168.1.1')
    })

    it('should extract IP from X-Real-IP header', () => {
      const req = {
        headers: {
          'x-real-ip': '203.0.113.42'
        },
        ip: '127.0.0.1'
      } as unknown as Request

      const result = IpUtil.extractIp(req)
      expect(result).toBe('203.0.113.42')
    })

    it('should fallback to req.ip', () => {
      const req = {
        headers: {},
        ip: '198.51.100.23'
      } as unknown as Request

      const result = IpUtil.extractIp(req)
      expect(result).toBe('198.51.100.23')
    })

    it('should return "unknown" when no IP is available', () => {
      const req = {
        headers: {}
      } as unknown as Request

      const result = IpUtil.extractIp(req)
      expect(result).toBe('unknown')
    })

    it('should handle array values in X-Forwarded-For', () => {
      const req = {
        headers: {
          'x-forwarded-for': ['192.168.1.100', '10.0.0.50']
        },
        ip: '127.0.0.1'
      } as unknown as Request

      const result = IpUtil.extractIp(req)
      expect(result).toBe('192.168.1.100')
    })
  })

  describe('hashIp', () => {
    const salt = 'test-salt-12345'

    it('should hash IP address with salt', () => {
      const ip = '192.168.1.1'
      const hash1 = IpUtil.hashIp(ip, salt)

      expect(hash1).toBeDefined()
      expect(hash1.length).toBe(64) // SHA-256 produces 64 hex characters
      expect(hash1).not.toBe(ip)
    })

    it('should produce consistent hashes for same IP and salt', () => {
      const ip = '203.0.113.42'
      const hash1 = IpUtil.hashIp(ip, salt)
      const hash2 = IpUtil.hashIp(ip, salt)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different IPs', () => {
      const ip1 = '192.168.1.1'
      const ip2 = '192.168.1.2'

      const hash1 = IpUtil.hashIp(ip1, salt)
      const hash2 = IpUtil.hashIp(ip2, salt)

      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different salts', () => {
      const ip = '192.168.1.1'
      const salt1 = 'salt-one'
      const salt2 = 'salt-two'

      const hash1 = IpUtil.hashIp(ip, salt1)
      const hash2 = IpUtil.hashIp(ip, salt2)

      expect(hash1).not.toBe(hash2)
    })

    it('should return "unknown" for unknown IP', () => {
      const result = IpUtil.hashIp('unknown', salt)
      expect(result).toBe('unknown')
    })

    it('should return "unknown" for empty IP', () => {
      const result = IpUtil.hashIp('', salt)
      expect(result).toBe('unknown')
    })
  })
})
