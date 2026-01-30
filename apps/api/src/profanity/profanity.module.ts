import { Module } from '@nestjs/common';
import { ProfanityController } from './profanity.controller';
import { ProfanityService } from './profanity.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [ProfanityController],
  providers: [ProfanityService],
  exports: [ProfanityService],
})
export class ProfanityModule {}
