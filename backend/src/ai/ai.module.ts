import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AIPromptService } from './ai-prompt.service';
import { PointsModule } from '../points/points.module';

@Module({
  controllers: [AiController],
  providers: [AiService, AIPromptService],
  imports: [PointsModule],
  exports: [AIPromptService],
})
export class AiModule {}
