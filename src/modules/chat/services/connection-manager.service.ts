import { Injectable, Logger } from '@nestjs/common'

export interface UserConnection {
  socketId: string
  userId: string
  connectedAt: Date
}

@Injectable()
export class ConnectionManagerService {
  private readonly logger = new Logger(ConnectionManagerService.name)

  // Map of userId -> Set of socketIds (user can have multiple connections)
  private readonly userConnections = new Map<string, Set<string>>()

  // Map of socketId -> userId (for quick lookup on disconnect)
  private readonly socketToUser = new Map<string, string>()

  addConnection(socketId: string, userId: string): void {
    // Add to socketToUser map
    this.socketToUser.set(socketId, userId)

    // Add to userConnections map
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set())
    }
    this.userConnections.get(userId)!.add(socketId)

    this.logger.debug(
      `User ${userId} connected with socket ${socketId}. Total connections: ${this.userConnections.get(userId)!.size}`
    )
  }

  removeConnection(socketId: string): string | undefined {
    const userId = this.socketToUser.get(socketId)

    if (!userId) {
      return undefined
    }

    // Remove from socketToUser map
    this.socketToUser.delete(socketId)

    // Remove from userConnections map
    const userSockets = this.userConnections.get(userId)
    if (userSockets) {
      userSockets.delete(socketId)

      if (userSockets.size === 0) {
        this.userConnections.delete(userId)
        this.logger.debug(`User ${userId} fully disconnected`)
      } else {
        this.logger.debug(
          `User ${userId} disconnected socket ${socketId}. Remaining connections: ${userSockets.size}`
        )
      }
    }

    return userId
  }

  getUserSockets(userId: string): string[] {
    const sockets = this.userConnections.get(userId)
    return sockets ? Array.from(sockets) : []
  }

  getUserIdBySocket(socketId: string): string | undefined {
    return this.socketToUser.get(socketId)
  }

  isUserOnline(userId: string): boolean {
    const connections = this.userConnections.get(userId)
    return connections !== undefined && connections.size > 0
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userConnections.keys())
  }

  getOnlineStatus(userIds: string[]): Map<string, boolean> {
    const statusMap = new Map<string, boolean>()
    for (const userId of userIds) {
      statusMap.set(userId, this.isUserOnline(userId))
    }
    return statusMap
  }

  getConnectionCount(): number {
    return this.socketToUser.size
  }

  getOnlineUserCount(): number {
    return this.userConnections.size
  }
}
