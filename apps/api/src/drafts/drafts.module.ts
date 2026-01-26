import { Module } from '@nestjs/common';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';
import { VoiceParserService } from './voice-parser.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [DraftsController],
  providers: [DraftsService, VoiceParserService],
  exports: [DraftsService],
})
export class DraftsModule {}
