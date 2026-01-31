import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PointsService } from './points.service';
import { RechargeDto } from './dto/recharge.dto';
import { VerifyIAPDto, VerifyIAPResponseDto } from './dto/verify-iap.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Points')
@ApiBearerAuth()
@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('balance')
  @ApiOperation({ summary: '獲取當前點數（含免費點數和購買點數明細）' })
  async getBalance(@CurrentUser() user: any) {
    const detail = await this.pointsService.getPointsDetail(user.userId);
    return {
      points: detail.total, // 總點數（向下相容）
      freePoints: detail.free, // 每日免費點數
      purchasedPoints: detail.purchased, // 購買點數
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

  @Post('verify-iap')
  @ApiOperation({ summary: '驗證 IAP 購買並發放點數' })
  async verifyIAP(
    @CurrentUser() user: any,
    @Body() dto: VerifyIAPDto,
  ): Promise<VerifyIAPResponseDto> {
    return this.pointsService.verifyIAPPurchase(user.userId, dto);
  }
}
