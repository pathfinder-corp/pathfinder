import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import Redis from 'ioredis'

export interface KeyStatus {
  keyHash: string
  requestsToday: number
  maxRequests: number
  available: boolean
  lastUsed: Date | null
  consecutiveFailures: number
}

@Injectable()
export class GenAIKeyManagerService implements OnModuleInit {
  private readonly logger = new Logger(GenAIKeyManagerService.name)
  private apiKeys: string[] = []
  private currentKeyIndex = 0
  private readonly maxRequestsPerDay = 20
  private readonly maxConsecutiveFailures = 5
  private readonly keyPrefix = 'genai:key:'
  private readonly failurePrefix = 'genai:failures:'
  private readonly redis: Redis

  constructor(private readonly configService: ConfigService) {
    const redisHost = this.configService.get<string>('redis.host')
    const redisPort = this.configService.get<number>('redis.port')
    const redisPassword = this.configService.get<string>('redis.password')
    const redisDb = this.configService.get<number>('redis.db')

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      db: redisDb
    })
  }

  async onModuleInit() {
    const keysString = this.configService.get<string>('genai.apiKeys')

    if (!keysString) {
      throw new Error('GENAI_API_KEYS is not configured')
    }

    // Parse comma-separated keys and trim whitespace
    this.apiKeys = keysString
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0)

    if (this.apiKeys.length === 0) {
      throw new Error('No valid API keys found in GENAI_API_KEYS')
    }

    this.logger.log(`Initialized with ${this.apiKeys.length} API keys`)

    // Initialize Redis counters for new keys
    await this.initializeKeys()
  }

  /**
   * Get the next available API key using round-robin with quota checking
   */
  async getNextKey(): Promise<string> {
    let attempts = 0

    while (attempts < this.apiKeys.length) {
      const key = this.apiKeys[this.currentKeyIndex]
      const keyHash = this.hashKey(key)

      // Check if key is available
      const status = await this.getKeyStatus(keyHash)

      if (status.available) {
        // Increment usage counter
        await this.incrementKeyUsage(keyHash)

        this.logger.debug(
          `Selected key ${keyHash} (${status.requestsToday + 1}/${this.maxRequestsPerDay} requests today)`
        )

        return key
      }

      // Move to next key
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
      attempts++
    }

    // All keys exhausted
    throw new Error(
      'All API keys have reached their daily quota or are marked as failed. Please try again later.'
    )
  }

  /**
   * Mark a key as successfully used (reset failure counter)
   */
  async markKeySuccess(key: string): Promise<void> {
    const keyHash = this.hashKey(key)
    const failureKey = `${this.failurePrefix}${keyHash}`

    await this.redis.del(failureKey)
  }

  /**
   * Mark a key as failed (increment failure counter)
   */
  async markKeyFailure(key: string, error: string): Promise<void> {
    const keyHash = this.hashKey(key)
    const failureKey = `${this.failurePrefix}${keyHash}`

    const failures = await this.redis.incr(failureKey)

    // Set expiration to 1 hour if it's a new key
    if (failures === 1) {
      await this.redis.expire(failureKey, 3600)
    }

    this.logger.warn(
      `Key ${keyHash} failed (${failures}/${this.maxConsecutiveFailures}): ${error}`
    )

    if (failures >= this.maxConsecutiveFailures) {
      this.logger.error(
        `Key ${keyHash} has been disabled due to ${failures} consecutive failures`
      )
    }
  }

  /**
   * Get status of all keys
   */
  async getAllKeyStatuses(): Promise<KeyStatus[]> {
    const statuses: KeyStatus[] = []

    for (const key of this.apiKeys) {
      const keyHash = this.hashKey(key)
      const status = await this.getKeyStatus(keyHash)
      statuses.push(status)
    }

    return statuses
  }

  /**
   * Reset all key counters (for testing or manual reset)
   */
  async resetAllKeys(): Promise<void> {
    for (const key of this.apiKeys) {
      const keyHash = this.hashKey(key)
      await this.redis.del(`${this.keyPrefix}${keyHash}`)
      await this.redis.del(`${this.failurePrefix}${keyHash}`)
    }

    this.logger.log('All key counters have been reset')
  }

  /**
   * Get the total number of available requests across all keys
   */
  async getTotalAvailableRequests(): Promise<number> {
    const statuses = await this.getAllKeyStatuses()
    return statuses.reduce((total, status) => {
      if (status.available) {
        return total + (status.maxRequests - status.requestsToday)
      }
      return total
    }, 0)
  }

  /**
   * Private: Get status for a specific key
   */
  private async getKeyStatus(keyHash: string): Promise<KeyStatus> {
    const usageKey = `${this.keyPrefix}${keyHash}`
    const failureKey = `${this.failurePrefix}${keyHash}`

    const [requestsToday, failures, lastUsedTimestamp] = await Promise.all([
      this.redis.get(usageKey),
      this.redis.get(failureKey),
      this.redis.get(`${usageKey}:last_used`)
    ])

    const requestCount = parseInt(requestsToday || '0', 10)
    const failureCount = parseInt(failures || '0', 10)
    const lastUsed = lastUsedTimestamp
      ? new Date(parseInt(lastUsedTimestamp, 10))
      : null

    const available =
      requestCount < this.maxRequestsPerDay &&
      failureCount < this.maxConsecutiveFailures

    return {
      keyHash,
      requestsToday: requestCount,
      maxRequests: this.maxRequestsPerDay,
      available,
      lastUsed,
      consecutiveFailures: failureCount
    }
  }

  /**
   * Private: Increment key usage counter
   */
  private async incrementKeyUsage(keyHash: string): Promise<void> {
    const usageKey = `${this.keyPrefix}${keyHash}`
    const lastUsedKey = `${usageKey}:last_used`

    const count = await this.redis.incr(usageKey)
    await this.redis.set(lastUsedKey, Date.now().toString())

    // Set expiration to end of day (UTC) if it's a new key
    if (count === 1) {
      const now = new Date()
      const endOfDay = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          0,
          0,
          0
        )
      )
      const ttl = Math.floor((endOfDay.getTime() - now.getTime()) / 1000)

      await this.redis.expire(usageKey, ttl)
      await this.redis.expire(lastUsedKey, ttl)
    }
  }

  /**
   * Private: Initialize Redis counters for all keys
   */
  private async initializeKeys(): Promise<void> {
    // Check if any keys need initialization
    for (const key of this.apiKeys) {
      const keyHash = this.hashKey(key)
      const usageKey = `${this.keyPrefix}${keyHash}`

      const exists = await this.redis.exists(usageKey)
      if (!exists) {
        // Key doesn't exist in Redis yet, set it to 0
        await this.redis.set(usageKey, '0')

        // Set expiration to end of day
        const now = new Date()
        const endOfDay = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            0,
            0,
            0
          )
        )
        const ttl = Math.floor((endOfDay.getTime() - now.getTime()) / 1000)
        await this.redis.expire(usageKey, ttl)
      }
    }
  }

  /**
   * Private: Hash API key for storage (avoid storing raw keys)
   */
  private hashKey(key: string): string {
    return crypto
      .createHash('sha256')
      .update(key)
      .digest('hex')
      .substring(0, 16)
  }
}
