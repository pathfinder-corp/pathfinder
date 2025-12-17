import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class ChatRedisService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatRedisService.name)
  private readonly client: Redis
  private readonly subscriber: Redis

  constructor(private readonly configService: ConfigService) {
    const redisConfig = {
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db')
    }

    this.client = new Redis(redisConfig) as any
    this.subscriber = new Redis(redisConfig) as any

    this.client.on('error', (err) =>
      this.logger.error('Redis Client Error', err)
    )
    this.subscriber.on('error', (err) =>
      this.logger.error('Redis Subscriber Error', err)
    )
  }

  async onModuleDestroy() {
    await this.client.quit()
    await this.subscriber.quit()
  }

  getClient(): Redis {
    return this.client
  }

  getSubscriber(): Redis {
    return this.subscriber
  }

  // Presence tracking
  async setUserOnline(userId: string, socketId: string): Promise<void> {
    await this.client.hset(`user:${userId}:sockets`, socketId, Date.now())
    await this.client.sadd('online:users', userId)
  }

  async setUserOffline(userId: string, socketId: string): Promise<void> {
    await this.client.hdel(`user:${userId}:sockets`, socketId)
    const remaining = await this.client.hlen(`user:${userId}:sockets`)
    if (remaining === 0) {
      await this.client.srem('online:users', userId)
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    return (await this.client.sismember('online:users', userId)) === 1
  }

  async getOnlineUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return []
    const results = await this.client.smismember('online:users', ...userIds)
    return userIds.filter((_, index) => results[index] === 1)
  }

  // Typing indicators
  async setTyping(
    conversationId: string,
    userId: string,
    ttl: number = 5
  ): Promise<void> {
    const key = `typing:${conversationId}:${userId}`
    await this.client.setex(key, ttl, '1')
  }

  async getTypingUsers(conversationId: string): Promise<string[]> {
    const pattern = `typing:${conversationId}:*`
    const keys = await this.client.keys(pattern)
    return keys.map((key) => key.split(':')[2])
  }

  async clearTyping(conversationId: string, userId: string): Promise<void> {
    await this.client.del(`typing:${conversationId}:${userId}`)
  }

  // Unread count
  async incrementUnreadCount(
    conversationId: string,
    userId: string
  ): Promise<number> {
    return await this.client.hincrby(`unread:${conversationId}`, userId, 1)
  }

  async resetUnreadCount(
    conversationId: string,
    userId: string
  ): Promise<void> {
    await this.client.hdel(`unread:${conversationId}`, userId)
  }

  async getUnreadCount(
    conversationId: string,
    userId: string
  ): Promise<number> {
    const count = await this.client.hget(`unread:${conversationId}`, userId)
    return count ? parseInt(count, 10) : 0
  }
}
