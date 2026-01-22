import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [PrismaModule, AiModule],
  exports: [AdminService],
})
export class AdminModule {}
