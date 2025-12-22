import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { MentorProfilesModule } from '../mentor-profiles/mentor-profiles.module'
import { MentorshipsModule } from '../mentorships/mentorships.module'
import { ChatController } from './chat.controller'
import { Conversation } from './entities/conversation.entity'
import { Message } from './entities/message.entity'
import { ChatGateway } from './gateways/chat.gateway'
import { ChatRedisService } from './services/chat-redis.service'
import { ChatService } from './services/chat.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    forwardRef(() => MentorshipsModule),
    MentorProfilesModule,
    AuthModule
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatRedisService, ChatGateway],
  exports: [ChatService, ChatRedisService, ChatGateway]
})
export class ChatModule {}
