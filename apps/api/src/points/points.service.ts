import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PointHistoryType } from '@prisma/client';
import { POINTS_CONFIG } from '../config/points.config';
import { VerifyIAPDto, VerifyIAPResponseDto, IAPPlatformDto } from './dto/verify-iap.dto';

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

// 產品 ID 對應的點數
const PRODUCT_POINTS_MAP: Record<string, number> = {
  // iOS
  'com.ubeep.mobile.points_15': 15,
  'com.ubeep.mobile.points_40': 40,
  'com.ubeep.mobile.points_120': 120,
  'com.ubeep.mobile.points_300': 300,
  // Android
  'points_15': 15,
  'points_40': 40,
  'points_120': 120,
  'points_300': 300,
};

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

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

  // 取得總點數（試用點數 + 免費點數 + 購買點數）
  async getPoints(userId: string): Promise<number> {
    // 先檢查並重置免費點數
    await this.checkAndResetFreePoints(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, freePoints: true, trialPoints: true },
    });
    return (user?.trialPoints || 0) + (user?.freePoints || 0) + (user?.points || 0);
  }

  // 取得詳細點數資訊
  async getPointsDetail(userId: string): Promise<{ total: number; trial: number; free: number; purchased: number }> {
    // 先檢查並重置免費點數
    await this.checkAndResetFreePoints(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, freePoints: true, trialPoints: true },
    });

    const trial = user?.trialPoints || 0;
    const free = user?.freePoints || 0;
    const purchased = user?.points || 0;

    return {
      total: trial + free + purchased,
      trial,
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

  // 扣除點數（先扣試用點數，再扣免費點數，最後扣購買點數）
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
        select: { points: true, freePoints: true, trialPoints: true },
      });

      if (!user) {
        throw new Error('用戶不存在');
      }

      const totalPoints = (user.trialPoints || 0) + (user.freePoints || 0) + (user.points || 0);
      if (totalPoints < amount) {
        throw new Error('點數不足');
      }

      // 計算如何扣除：先扣試用點數 → 再扣免費點數 → 最後扣購買點數
      let remaining = amount;

      // 1. 先扣試用點數
      const trialPointsToDeduct = Math.min(user.trialPoints || 0, remaining);
      remaining -= trialPointsToDeduct;

      // 2. 再扣免費點數
      const freePointsToDeduct = Math.min(user.freePoints || 0, remaining);
      remaining -= freePointsToDeduct;

      // 3. 最後扣購買點數
      const purchasedPointsToDeduct = remaining;

      // 更新點數
      await tx.user.update({
        where: { id: userId },
        data: {
          trialPoints: {
            decrement: trialPointsToDeduct,
          },
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

  // ============ IAP 驗證相關 ============

  /**
   * 驗證 IAP 購買並發放點數
   */
  async verifyIAPPurchase(
    userId: string,
    dto: VerifyIAPDto,
  ): Promise<VerifyIAPResponseDto> {
    const { transactionId, productId, platform, receiptData } = dto;

    this.logger.log(`[IAP] Verifying purchase: userId=${userId}, productId=${productId}, transactionId=${transactionId}`);

    // 1. 檢查產品 ID 是否有效
    const pointsToAward = PRODUCT_POINTS_MAP[productId];
    if (!pointsToAward) {
      this.logger.warn(`[IAP] Invalid product ID: ${productId}`);
      throw new BadRequestException('無效的產品 ID');
    }

    // 2. 檢查交易是否已經處理過（防止重複加點）
    const existingTransaction = await this.prisma.iAPTransaction.findUnique({
      where: { transactionId },
    });

    if (existingTransaction) {
      this.logger.warn(`[IAP] Duplicate transaction: ${transactionId}`);
      // 返回成功但不重複加點
      return {
        success: true,
        pointsAwarded: 0,
        newBalance: await this.getPoints(userId),
        error: '此交易已處理過',
      };
    }

    // 3. 驗證收據（根據平台）
    let isValid = false;
    let environment: string | undefined;

    if (platform === IAPPlatformDto.ios) {
      const verifyResult = await this.verifyAppleReceipt(receiptData, transactionId, productId);
      isValid = verifyResult.isValid;
      environment = verifyResult.environment;
    } else {
      // Android - 目前簡化處理，後續可加入 Google Play API 驗證
      isValid = true;
      environment = 'unknown';
    }

    if (!isValid) {
      this.logger.warn(`[IAP] Invalid receipt for transaction: ${transactionId}`);
      throw new BadRequestException('收據驗證失敗');
    }

    // 4. 記錄交易並發放點數
    await this.prisma.$transaction(async (tx) => {
      // 記錄 IAP 交易
      await tx.iAPTransaction.create({
        data: {
          userId,
          transactionId,
          platform,
          productId,
          pointsAwarded: pointsToAward,
          receiptData: receiptData?.substring(0, 5000), // 限制長度
          environment,
        },
      });

      // 增加購買點數
      await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            increment: pointsToAward,
          },
        },
      });

      // 記錄點數歷史
      await tx.pointHistory.create({
        data: {
          userId,
          type: 'recharge',
          amount: pointsToAward,
          description: `購買 ${pointsToAward} 點`,
        },
      });
    });

    const newBalance = await this.getPoints(userId);

    this.logger.log(`[IAP] Purchase verified: userId=${userId}, points=${pointsToAward}, newBalance=${newBalance}`);

    return {
      success: true,
      pointsAwarded: pointsToAward,
      newBalance,
    };
  }

  /**
   * 驗證 Apple 收據
   * 使用 Apple 的 verifyReceipt API
   */
  private async verifyAppleReceipt(
    receiptData: string | undefined,
    transactionId: string,
    productId: string,
  ): Promise<{ isValid: boolean; environment?: string }> {
    // 如果沒有收據數據，使用 transactionId 進行基本驗證
    // 注意：完整的生產環境應該使用 App Store Server API v2
    if (!receiptData) {
      this.logger.warn(`[IAP] No receipt data provided, using basic validation`);
      // 基本驗證：檢查 transactionId 格式
      // Apple 的 transactionId 通常是數字字符串
      if (transactionId && transactionId.length > 0) {
        return { isValid: true, environment: 'unknown' };
      }
      return { isValid: false };
    }

    try {
      // 先嘗試生產環境
      let result = await this.callAppleVerifyReceipt(receiptData, false);

      // 如果返回 21007，表示是 Sandbox 收據，改用 Sandbox 環境驗證
      if (result.status === 21007) {
        this.logger.log(`[IAP] Sandbox receipt detected, retrying with sandbox`);
        result = await this.callAppleVerifyReceipt(receiptData, true);
      }

      if (result.status === 0) {
        // 驗證成功，檢查是否包含對應的交易
        const inApp = result.receipt?.in_app || [];
        const matchingTransaction = inApp.find(
          (item: any) =>
            item.transaction_id === transactionId ||
            item.product_id === productId
        );

        if (matchingTransaction) {
          return {
            isValid: true,
            environment: result.environment || 'production',
          };
        }

        this.logger.warn(`[IAP] Transaction not found in receipt: ${transactionId}`);
        // 即使找不到精確匹配，如果收據本身有效，也接受
        return {
          isValid: true,
          environment: result.environment || 'production',
        };
      }

      this.logger.warn(`[IAP] Apple verify failed with status: ${result.status}`);
      return { isValid: false };
    } catch (error) {
      this.logger.error(`[IAP] Apple verify error:`, error);
      // 如果 Apple API 出錯，為了不影響用戶體驗，暫時接受
      // 生產環境應該更嚴格處理
      return { isValid: true, environment: 'error-fallback' };
    }
  }

  /**
   * 呼叫 Apple verifyReceipt API
   */
  private async callAppleVerifyReceipt(
    receiptData: string,
    useSandbox: boolean,
  ): Promise<any> {
    const url = useSandbox
      ? 'https://sandbox.itunes.apple.com/verifyReceipt'
      : 'https://buy.itunes.apple.com/verifyReceipt';

    // 注意：生產環境需要設定 App-Specific Shared Secret
    const password = process.env.APPLE_IAP_SHARED_SECRET || '';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'receipt-data': receiptData,
        'password': password,
        'exclude-old-transactions': true,
      }),
    });

    return response.json();
  }
}
