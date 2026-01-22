import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PointsModule } from '../points/points.module';
import { InviteModule } from '../invite/invite.module';

@Module({
  imports: [PointsModule, forwardRef(() => InviteModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
