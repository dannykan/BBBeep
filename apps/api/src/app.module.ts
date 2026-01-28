import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { R2Module } from './common/storage/r2.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MessagesModule } from './messages/messages.module';
import { PointsModule } from './points/points.module';
import { AiModule } from './ai/ai.module';
import { RedisModule } from './common/redis/redis.module';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';
import { InviteModule } from './invite/invite.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ActivitiesModule } from './activities/activities.module';
import { DraftsModule } from './drafts/drafts.module';
import { SavedPlatesModule } from './saved-plates/saved-plates.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    R2Module,
    RedisModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    MessagesModule,
    PointsModule,
    AiModule,
    AdminModule,
    UploadModule,
    InviteModule,
    ActivitiesModule,
    DraftsModule,
    SavedPlatesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
