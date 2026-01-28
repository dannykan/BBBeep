import { Module } from '@nestjs/common';
import { SavedPlatesController } from './saved-plates.controller';
import { SavedPlatesService } from './saved-plates.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SavedPlatesController],
  providers: [SavedPlatesService],
  exports: [SavedPlatesService],
})
export class SavedPlatesModule {}
