import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PointsService } from '../points/points.service';

// 排除易混淆字元：0, O, I, l
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 6;

@Injectable()
export class InviteService {
  constructor(
    private prisma: PrismaService,
    private pointsService: PointsService,
  ) {}

  // 生成唯一邀請碼
  private generateInviteCode(): string {
    let code = '';
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
      code += INVITE_CODE_CHARS.charAt(Math.floor(Math.random() * INVITE_CODE_CHARS.length));
    }
    return code;
  }

  // 生成唯一邀請碼（確保不重複）
  async generateUniqueInviteCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateInviteCode();
      const existing = await this.prisma.user.findUnique({
        where: { inviteCode: code },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('無法生成唯一邀請碼，請稍後再試');
    }

    return code;
  }

  // 取得或初始化邀請設定
  async getInviteSettings() {
    let settings = await this.prisma.inviteSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.inviteSettings.create({
        data: {
          defaultInviterReward: 5,
          defaultInviteeReward: 3,
          isEnabled: true,
        },
      });
    }
    return settings;
  }

  // 取得用戶的邀請碼和統計
  async getMyInviteCode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        inviteCode: true,
        customInviterReward: true,
        customInviteeReward: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    // 如果用戶還沒有邀請碼，生成一個
    let inviteCode = user.inviteCode;
    if (!inviteCode) {
      inviteCode = await this.generateUniqueInviteCode();
      await this.prisma.user.update({
        where: { id: userId },
        data: { inviteCode },
      });
    }

    // 取得邀請統計
    const inviteHistory = await this.prisma.inviteHistory.findMany({
      where: {
        inviterId: userId,
        status: 'completed',
      },
    });

    const inviteCount = inviteHistory.length;
    const totalRewards = inviteHistory.reduce((sum, h) => sum + h.inviterReward, 0);

    // 取得獎勵設定
    const settings = await this.getInviteSettings();
    const inviterReward = user.customInviterReward ?? settings.defaultInviterReward;
    const inviteeReward = user.customInviteeReward ?? settings.defaultInviteeReward;

    return {
      inviteCode,
      inviteCount,
      totalRewards,
      inviterReward,
      inviteeReward,
    };
  }

  // 驗證邀請碼（無需登入，用於 onboarding）
  async validateInviteCode(code: string, currentUserId?: string) {
    const settings = await this.getInviteSettings();

    if (!settings.isEnabled) {
      return {
        valid: false,
        message: '邀請系統目前已停用',
      };
    }

    const inviter = await this.prisma.user.findUnique({
      where: { inviteCode: code.toUpperCase() },
      select: {
        id: true,
        nickname: true,
        customInviteeReward: true,
      },
    });

    if (!inviter) {
      return {
        valid: false,
        message: '無效的邀請碼',
      };
    }

    // 禁止自己邀請自己
    if (currentUserId && inviter.id === currentUserId) {
      return {
        valid: false,
        message: '不能使用自己的邀請碼',
      };
    }

    const inviteeReward = inviter.customInviteeReward ?? settings.defaultInviteeReward;

    return {
      valid: true,
      inviterNickname: inviter.nickname || '匿名用戶',
      inviteeReward,
    };
  }

  // 使用邀請碼
  async applyInviteCode(userId: string, code: string) {
    const settings = await this.getInviteSettings();

    if (!settings.isEnabled) {
      throw new BadRequestException('邀請系統目前已停用');
    }

    // 檢查用戶是否已經使用過邀請碼
    const existingInvite = await this.prisma.inviteHistory.findUnique({
      where: { inviteeId: userId },
    });

    if (existingInvite) {
      throw new BadRequestException('您已經使用過邀請碼');
    }

    // 檢查用戶是否已被邀請
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { invitedById: true, hasCompletedOnboarding: true },
    });

    if (user?.invitedById) {
      throw new BadRequestException('您已經被邀請過了');
    }

    // 驗證邀請碼
    const validation = await this.validateInviteCode(code, userId);
    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    // 找到邀請人
    const inviter = await this.prisma.user.findUnique({
      where: { inviteCode: code.toUpperCase() },
      select: {
        id: true,
        customInviterReward: true,
        customInviteeReward: true,
      },
    });

    if (!inviter) {
      throw new BadRequestException('無效的邀請碼');
    }

    const inviterReward = inviter.customInviterReward ?? settings.defaultInviterReward;
    const inviteeReward = inviter.customInviteeReward ?? settings.defaultInviteeReward;

    // 創建邀請記錄並更新用戶
    await this.prisma.$transaction(async (tx) => {
      // 更新被邀請人的 invitedById
      await tx.user.update({
        where: { id: userId },
        data: { invitedById: inviter.id },
      });

      // 創建邀請記錄
      await tx.inviteHistory.create({
        data: {
          inviterId: inviter.id,
          inviteeId: userId,
          inviteCode: code.toUpperCase(),
          status: user?.hasCompletedOnboarding ? 'completed' : 'pending',
          inviterReward,
          inviteeReward,
          rewardedAt: user?.hasCompletedOnboarding ? new Date() : null,
        },
      });

      // 如果用戶已完成 onboarding，立即發放獎勵
      if (user?.hasCompletedOnboarding) {
        await this.distributeRewards(tx, inviter.id, userId, inviterReward, inviteeReward);
      }
    });

    return {
      success: true,
      inviterNickname: validation.inviterNickname,
      inviteeReward,
    };
  }

  // 發放獎勵（在 onboarding 完成時調用）
  async processInviteReward(userId: string): Promise<{ inviteeReward: number } | null> {
    const inviteRecord = await this.prisma.inviteHistory.findUnique({
      where: { inviteeId: userId },
      include: { inviter: true },
    });

    if (!inviteRecord || inviteRecord.status !== 'pending') {
      return null;
    }

    await this.prisma.$transaction(async (tx) => {
      // 更新邀請記錄狀態
      await tx.inviteHistory.update({
        where: { id: inviteRecord.id },
        data: {
          status: 'completed',
          rewardedAt: new Date(),
        },
      });

      // 發放獎勵
      await this.distributeRewards(
        tx,
        inviteRecord.inviterId,
        userId,
        inviteRecord.inviterReward,
        inviteRecord.inviteeReward,
      );
    });

    return { inviteeReward: inviteRecord.inviteeReward };
  }

  // 發放獎勵的內部方法
  private async distributeRewards(
    tx: any,
    inviterId: string,
    inviteeId: string,
    inviterReward: number,
    inviteeReward: number,
  ) {
    // 給邀請人加點數
    await tx.user.update({
      where: { id: inviterId },
      data: { points: { increment: inviterReward } },
    });

    await tx.pointHistory.create({
      data: {
        userId: inviterId,
        type: 'bonus',
        amount: inviterReward,
        description: '邀請好友獎勵',
      },
    });

    // 給被邀請人加點數
    await tx.user.update({
      where: { id: inviteeId },
      data: { points: { increment: inviteeReward } },
    });

    await tx.pointHistory.create({
      data: {
        userId: inviteeId,
        type: 'bonus',
        amount: inviteeReward,
        description: '受邀註冊獎勵',
      },
    });
  }

  // 取得我的邀請記錄
  async getInviteHistory(userId: string) {
    const history = await this.prisma.inviteHistory.findMany({
      where: { inviterId: userId },
      include: {
        invitee: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return history.map((h) => ({
      id: h.id,
      inviteeNickname: h.invitee.nickname || '匿名用戶',
      status: h.status,
      reward: h.inviterReward,
      createdAt: h.createdAt,
      rewardedAt: h.rewardedAt,
    }));
  }
}
