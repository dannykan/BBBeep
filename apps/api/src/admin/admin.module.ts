import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [PrismaModule, AiModule, ActivitiesModule],
  exports: [AdminService],
})
export class AdminModule {}
