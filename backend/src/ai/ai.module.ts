import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PointsModule } from '../points/points.module';

@Module({
  controllers: [AiController],
  providers: [AiService],
  imports: [PointsModule],
})
export class AiModule {}
