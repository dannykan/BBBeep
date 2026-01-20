import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PointsService } from './points.service';
import { RechargeDto } from './dto/recharge.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Points')
@ApiBearerAuth()
@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('balance')
  @ApiOperation({ summary: '獲取當前點數' })
  async getBalance(@CurrentUser() user: any) {
    return {
      points: await this.pointsService.getPoints(user.userId),
    };
  }

  @Get('history')
  @ApiOperation({ summary: '獲取點數歷史記錄' })
  async getHistory(@CurrentUser() user: any) {
    return this.pointsService.getHistory(user.userId);
  }

  @Post('recharge')
  @ApiOperation({ summary: '儲值點數' })
  async recharge(@CurrentUser() user: any, @Body() dto: RechargeDto) {
    return this.pointsService.recharge(user.userId, dto.amount);
  }
}
