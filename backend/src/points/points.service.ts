import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PointHistoryType } from '@prisma/client';

interface AddPointHistoryParams {
  type: PointHistoryType;
  description: string;
}

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  async getPoints(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });
    return user?.points || 0;
  }

  async addPoints(
    userId: string,
    amount: number,
    history: AddPointHistoryParams,
  ) {
    await this.prisma.$transaction(async (tx) => {
      // 更新點數
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

  async deductPoints(
    userId: string,
    amount: number,
    history: AddPointHistoryParams,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { points: true },
      });

      if (!user || user.points < amount) {
        throw new Error('點數不足');
      }

      // 更新點數
      await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            decrement: amount,
          },
        },
      });

      // 記錄歷史
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

  async recharge(userId: string, amount: number) {
    // 模擬支付流程（實際應該整合支付系統）
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
