import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PointHistoryType } from '@prisma/client';
import { POINTS_CONFIG } from '../config/points.config';

interface AddPointHistoryParams {
  type: PointHistoryType;
  description: string;
}

// 從設定檔讀取每日免費點數
// 注意：根據規則，試用結束後不提供每日免費點數
// 這裡保留 legacy 設定供過渡期使用
const DAILY_FREE_POINTS = POINTS_CONFIG.basic.dailyFreePoints.enabled
  ? POINTS_CONFIG.basic.dailyFreePoints.amount
  : POINTS_CONFIG.legacy.dailyFreePoints;

const TAIPEI_TIMEZONE = 'Asia/Taipei';

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  // 取得台北時間的今天日期字串 (YYYY-MM-DD)
  private getTaipeiDateString(): string {
    const now = new Date();
    const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: TAIPEI_TIMEZONE }));
    return taipeiTime.toISOString().split('T')[0];
  }

  // 檢查並重置免費點數（如果是新的一天）
  async checkAndResetFreePoints(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { freePoints: true, lastFreePointsReset: true },
    });

    if (!user) return;

    const todayStr = this.getTaipeiDateString();

    // 如果從未重置過，或者上次重置不是今天，則重置
    let shouldReset = false;
    if (!user.lastFreePointsReset) {
      shouldReset = true;
    } else {
      const lastResetDate = new Date(user.lastFreePointsReset.toLocaleString('en-US', { timeZone: TAIPEI_TIMEZONE }));
      const lastResetStr = lastResetDate.toISOString().split('T')[0];
      shouldReset = lastResetStr !== todayStr;
    }

    if (shouldReset) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          freePoints: DAILY_FREE_POINTS,
          lastFreePointsReset: new Date(),
        },
      });
    }
  }

  // 取得總點數（免費點數 + 購買點數）
  async getPoints(userId: string): Promise<number> {
    // 先檢查並重置免費點數
    await this.checkAndResetFreePoints(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, freePoints: true },
    });
    return (user?.points || 0) + (user?.freePoints || 0);
  }

  // 取得詳細點數資訊
  async getPointsDetail(userId: string): Promise<{ total: number; free: number; purchased: number }> {
    // 先檢查並重置免費點數
    await this.checkAndResetFreePoints(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, freePoints: true },
    });

    const free = user?.freePoints || 0;
    const purchased = user?.points || 0;

    return {
      total: free + purchased,
      free,
      purchased,
    };
  }

  // 新增購買點數
  async addPoints(
    userId: string,
    amount: number,
    history: AddPointHistoryParams,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // 更新購買點數
      await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            increment: amount,
          },
        },
      });

      // 記錄歷史
      await tx.pointHistory.create({
        data: {
          userId,
          type: history.type,
          amount,
          description: history.description,
        },
      });
    });
  }

  // 扣除點數（先扣免費點數，再扣購買點數）
  async deductPoints(
    userId: string,
    amount: number,
    history: AddPointHistoryParams,
  ) {
    // 先檢查並重置免費點數
    await this.checkAndResetFreePoints(userId);

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { points: true, freePoints: true },
      });

      if (!user) {
        throw new Error('用戶不存在');
      }

      const totalPoints = (user.points || 0) + (user.freePoints || 0);
      if (totalPoints < amount) {
        throw new Error('點數不足');
      }

      // 計算如何扣除：先扣免費點數，再扣購買點數
      let freePointsToDeduct = Math.min(user.freePoints || 0, amount);
      let purchasedPointsToDeduct = amount - freePointsToDeduct;

      // 更新點數
      await tx.user.update({
        where: { id: userId },
        data: {
          freePoints: {
            decrement: freePointsToDeduct,
          },
          points: {
            decrement: purchasedPointsToDeduct,
          },
        },
      });

      // 記錄歷史（記錄總扣除數）
      await tx.pointHistory.create({
        data: {
          userId,
          type: history.type,
          amount: -amount,
          description: history.description,
        },
      });
    });
  }

  // 儲值（只增加購買點數）
  async recharge(userId: string, amount: number) {
    await this.addPoints(userId, amount, {
      type: 'recharge',
      description: `儲值 ${amount} 點`,
    });

    return {
      success: true,
      newBalance: await this.getPoints(userId),
    };
  }

  async getHistory(userId: string) {
    return this.prisma.pointHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
