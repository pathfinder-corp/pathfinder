import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'

import { MentorApplication } from '../mentor-applications/entities/mentor-application.entity'
import { MentorshipRequest } from '../mentorship-requests/entities/mentorship-request.entity'
import { Mentorship } from '../mentorships/entities/mentorship.entity'
import { MessagesModule } from '../messages/messages.module'
import { UsersModule } from '../users/users.module'
import { ChatController } from './chat.controller'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'
import { Conversation } from './entities/conversation.entity'
import { WsAuthGuard } from './guards/ws-auth.guard'
import { ConnectionManagerService } from './services/connection-manager.service'
import { PresenceService } from './services/presence.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      MentorApplication,
      MentorshipRequest,
      Mentorship
    ]),
    MessagesModule,
    UsersModule,
    ConfigModule,
    JwtModule
  ],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    ChatService,
    ConnectionManagerService,
    PresenceService,
    WsAuthGuard
  ],
  exports: [ChatService, ChatGateway, ConnectionManagerService, PresenceService]
})
export class ChatModule {}
