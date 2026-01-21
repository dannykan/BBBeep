import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserType, VehicleType, InviteStatus } from '@prisma/client';
import { normalizeLicensePlate } from '../common/utils/license-plate-format';

const ADMIN_PASSWORD = '12345678';

// 排除易混淆字元：0, O, I, l
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 6;

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async login(password: string) {
    if (password !== ADMIN_PASSWORD) {
      throw new UnauthorizedException('密碼錯誤');
    }
    // 簡單的 token（實際應該使用 JWT）
    return {
      token: Buffer.from(`admin_${Date.now()}`).toString('base64'),
      expiresIn: '24h',
    };
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      return decoded.startsWith('admin_');
    } catch {
      return false;
    }
  }

  async getAllUsers(userType?: UserType) {
    const where: any = {
      // 排除臨時用戶和未綁定車牌用戶
      // 包含: LINE 用戶 (phone 為 null) 或 一般用戶 (phone 不以 temp_/unbound_ 開頭)
      OR: [
        { phone: null }, // LINE 用戶
        {
          AND: [
            { phone: { not: { startsWith: 'temp_' } } },
            { phone: { not: { startsWith: 'unbound_' } } },
          ],
        },
      ],
    };

    if (userType) {
      where.userType = userType;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        phone: true,
        nickname: true,
        licensePlate: true,
        userType: true,
        vehicleType: true,
        points: true,
        freePoints: true,
        hasCompletedOnboarding: true,
        createdAt: true,
        // LINE Login 相關
        lineUserId: true,
        lineDisplayName: true,
        linePictureUrl: true,
        // 封鎖狀態
        isBlockedByAdmin: true,
        _count: {
          select: {
            receivedMessages: true,
            sentMessages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            receivedMessages: true,
            sentMessages: true,
            pointHistory: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    return user;
  }

  async updateUser(userId: string, data: {
    nickname?: string;
    licensePlate?: string;
    userType?: UserType;
    vehicleType?: VehicleType;
    points?: number;
    email?: string;
  }) {
    const updateData: any = {};
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.licensePlate !== undefined) {
      const normalizedPlate = normalizeLicensePlate(data.licensePlate);
      if (!normalizedPlate) {
        throw new BadRequestException('車牌號碼格式無效');
      }
      updateData.licensePlate = normalizedPlate;
    }
    if (data.userType !== undefined) updateData.userType = data.userType;
    if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.email !== undefined) updateData.email = data.email;

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async getUserMessages(userId: string, type: 'received' | 'sent' = 'received') {
    const where = type === 'received' 
      ? { receiverId: userId }
      : { senderId: userId };

    return this.prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            licensePlate: true,
          },
        },
        receiver: {
          select: {
            id: true,
            nickname: true,
            licensePlate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMessage(messageId: string, data: {
    template?: string;
    customText?: string;
    read?: boolean;
  }) {
    return this.prisma.message.update({
      where: { id: messageId },
      data,
    });
  }

  async deleteMessage(messageId: string) {
    return this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  async createUnboundLicensePlate(data: {
    licensePlate: string;
    vehicleType: VehicleType;
    userType: UserType;
  }) {
    // 格式化車牌（去除分隔符）
    const normalizedPlate = normalizeLicensePlate(data.licensePlate);
    if (!normalizedPlate) {
      throw new BadRequestException('車牌號碼格式無效');
    }
    
    // 檢查車牌是否已存在（不包括臨時和未綁定用戶）
    const existing = await this.prisma.user.findFirst({
      where: {
        licensePlate: normalizedPlate,
        AND: [
          { phone: { not: { startsWith: 'temp_' } } },
          { phone: { not: { startsWith: 'unbound_' } } },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('該車牌已被綁定');
    }

    // 創建未綁定車牌用戶
    return this.prisma.user.create({
      data: {
        phone: `unbound_${normalizedPlate}_${Date.now()}`,
        licensePlate: normalizedPlate, // 使用格式化後的車牌（不含分隔符）
        userType: data.userType,
        vehicleType: data.vehicleType,
        points: 0,
        hasCompletedOnboarding: false,
      },
    });
  }

  async updateLicensePlate(userId: string, licensePlate: string) {
    // 格式化車牌（去除分隔符）
    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!normalizedPlate) {
      throw new BadRequestException('車牌號碼格式無效');
    }
    
      // 檢查新車牌是否已被其他用戶使用（不包括臨時和未綁定用戶）
      const existing = await this.prisma.user.findFirst({
        where: {
          licensePlate: normalizedPlate,
          id: { not: userId },
          AND: [
            { phone: { not: { startsWith: 'temp_' } } },
            { phone: { not: { startsWith: 'unbound_' } } },
          ],
        },
      });

    if (existing) {
      throw new BadRequestException('該車牌已被其他用戶使用');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { licensePlate: normalizedPlate }, // 使用格式化後的車牌（不含分隔符）
    });
  }

  async getAllLicensePlateApplications(status?: 'pending' | 'approved' | 'rejected') {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.licensePlateApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            nickname: true,
            lineDisplayName: true,
            linePictureUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewApplication(applicationId: string, decision: 'approved' | 'rejected', adminNote?: string) {
    const application = await this.prisma.licensePlateApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      throw new NotFoundException('申請不存在');
    }

    if (application.status !== 'pending') {
      throw new BadRequestException('該申請已被審核');
    }

    if (decision === 'approved') {
      // 格式化車牌（申請中的車牌應該已經是格式化過的，但為了安全再次格式化）
      const normalizedPlate = normalizeLicensePlate(application.licensePlate);
      if (!normalizedPlate) {
        throw new BadRequestException('車牌號碼格式無效');
      }
      
      // 檢查車牌是否已被綁定（不包括臨時和未綁定用戶）
      const existing = await this.prisma.user.findFirst({
        where: {
          licensePlate: normalizedPlate,
          AND: [
            { phone: { not: { startsWith: 'temp_' } } },
            { phone: { not: { startsWith: 'unbound_' } } },
          ],
        },
      });

      if (existing) {
        throw new BadRequestException('該車牌已被綁定');
      }

      // 更新用戶車牌
      await this.prisma.user.update({
        where: { id: application.userId },
        data: {
          licensePlate: normalizedPlate, // 使用格式化後的車牌（不含分隔符）
          vehicleType: application.vehicleType || undefined,
        },
      });
    }

    // 更新申請狀態
    return this.prisma.licensePlateApplication.update({
      where: { id: applicationId },
      data: {
        status: decision,
        adminNote,
        reviewedAt: new Date(),
      },
    });
  }

  async getAllMessageReports(status?: 'pending' | 'reviewed' | 'resolved') {
    const where: any = {};
    if (status) {
      where.status = status as any;
    }

    return this.prisma.messageReport.findMany({
      where,
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                phone: true,
                nickname: true,
                licensePlate: true,
              },
            },
            receiver: {
              select: {
                id: true,
                phone: true,
                nickname: true,
                licensePlate: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            phone: true,
            nickname: true,
            licensePlate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewMessageReport(reportId: string, decision: 'reviewed' | 'resolved', adminNote?: string) {
    const report = await this.prisma.messageReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('檢舉記錄不存在');
    }

    return this.prisma.messageReport.update({
      where: { id: reportId },
      data: {
        status: decision as any,
        adminNote,
        reviewedAt: new Date(),
      },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                phone: true,
                nickname: true,
                licensePlate: true,
              },
            },
            receiver: {
              select: {
                id: true,
                phone: true,
                nickname: true,
                licensePlate: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            phone: true,
            nickname: true,
            licensePlate: true,
          },
        },
      },
    });
  }

  // 官方封鎖用戶
  async blockUser(userId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    if (user.isBlockedByAdmin) {
      throw new BadRequestException('該用戶已被封鎖');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isBlockedByAdmin: true,
        blockedByAdminAt: new Date(),
        blockedByAdminReason: reason || null,
      },
    });
  }

  // 解除官方封鎖
  async unblockUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    if (!user.isBlockedByAdmin) {
      throw new BadRequestException('該用戶未被封鎖');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isBlockedByAdmin: false,
        blockedByAdminAt: null,
        blockedByAdminReason: null,
      },
    });
  }

  // 取得所有被封鎖的用戶
  async getBlockedUsers() {
    return this.prisma.user.findMany({
      where: { isBlockedByAdmin: true },
      select: {
        id: true,
        phone: true,
        nickname: true,
        licensePlate: true,
        lineUserId: true,
        lineDisplayName: true,
        linePictureUrl: true,
        isBlockedByAdmin: true,
        blockedByAdminAt: true,
        blockedByAdminReason: true,
        createdAt: true,
      },
      orderBy: { blockedByAdminAt: 'desc' },
    });
  }

  // 刪除用戶（讓用戶可以重新註冊）
  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    // 刪除用戶相關的所有資料
    // 1. 刪除點數歷史
    await this.prisma.pointHistory.deleteMany({
      where: { userId },
    });

    // 2. 刪除 AI 使用記錄
    await this.prisma.aIUsageLog.deleteMany({
      where: { userId },
    });

    // 3. 刪除封鎖/被封鎖記錄
    await this.prisma.blockedUser.deleteMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });

    // 4. 刪除拒收記錄
    await this.prisma.rejectedUser.deleteMany({
      where: { OR: [{ rejecterId: userId }, { rejectedId: userId }] },
    });

    // 5. 刪除訊息檢舉記錄
    await this.prisma.messageReport.deleteMany({
      where: { reporterId: userId },
    });

    // 6. 刪除車牌申請
    await this.prisma.licensePlateApplication.deleteMany({
      where: { userId },
    });

    // 7. 刪除收到的和發送的訊息
    await this.prisma.message.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    });

    // 8. 最後刪除用戶
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { success: true, message: '用戶已刪除' };
  }

  // ========== 邀請碼管理 ==========

  // 生成唯一邀請碼
  private generateInviteCode(): string {
    let code = '';
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
      code += INVITE_CODE_CHARS.charAt(Math.floor(Math.random() * INVITE_CODE_CHARS.length));
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

  // 更新邀請設定
  async updateInviteSettings(data: {
    defaultInviterReward?: number;
    defaultInviteeReward?: number;
    isEnabled?: boolean;
  }) {
    const settings = await this.getInviteSettings();
    return this.prisma.inviteSettings.update({
      where: { id: settings.id },
      data,
    });
  }

  // 取得邀請統計
  async getInviteStatistics() {
    const [
      totalInvites,
      completedInvites,
      pendingInvites,
      totalInviterRewards,
      totalInviteeRewards,
    ] = await Promise.all([
      this.prisma.inviteHistory.count(),
      this.prisma.inviteHistory.count({ where: { status: 'completed' } }),
      this.prisma.inviteHistory.count({ where: { status: 'pending' } }),
      this.prisma.inviteHistory.aggregate({
        where: { status: 'completed' },
        _sum: { inviterReward: true },
      }),
      this.prisma.inviteHistory.aggregate({
        where: { status: 'completed' },
        _sum: { inviteeReward: true },
      }),
    ]);

    return {
      totalInvites,
      completedInvites,
      pendingInvites,
      expiredInvites: totalInvites - completedInvites - pendingInvites,
      totalInviterRewards: totalInviterRewards._sum.inviterReward || 0,
      totalInviteeRewards: totalInviteeRewards._sum.inviteeReward || 0,
      totalRewardsDistributed: (totalInviterRewards._sum.inviterReward || 0) + (totalInviteeRewards._sum.inviteeReward || 0),
    };
  }

  // 取得所有邀請記錄
  async getAllInviteHistory(status?: InviteStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.inviteHistory.findMany({
      where,
      include: {
        inviter: {
          select: {
            id: true,
            phone: true,
            nickname: true,
            licensePlate: true,
          },
        },
        invitee: {
          select: {
            id: true,
            phone: true,
            nickname: true,
            licensePlate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 更新用戶的邀請碼設定
  async updateUserInviteSettings(userId: string, data: {
    inviteCode?: string;
    customInviterReward?: number | null;
    customInviteeReward?: number | null;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    const updateData: any = {};

    // 更新邀請碼
    if (data.inviteCode !== undefined) {
      const code = data.inviteCode.toUpperCase();

      // 驗證邀請碼格式
      if (!/^[A-Z0-9]{6}$/.test(code)) {
        throw new BadRequestException('邀請碼必須為6位大寫英數字');
      }

      // 檢查邀請碼是否已被使用
      const existing = await this.prisma.user.findFirst({
        where: {
          inviteCode: code,
          id: { not: userId },
        },
      });

      if (existing) {
        throw new BadRequestException('該邀請碼已被使用');
      }

      updateData.inviteCode = code;
    }

    // 更新自訂獎勵
    if (data.customInviterReward !== undefined) {
      updateData.customInviterReward = data.customInviterReward;
    }
    if (data.customInviteeReward !== undefined) {
      updateData.customInviteeReward = data.customInviteeReward;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        nickname: true,
        inviteCode: true,
        customInviterReward: true,
        customInviteeReward: true,
      },
    });
  }

  // 為用戶生成新的邀請碼
  async generateUserInviteCode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

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
      throw new BadRequestException('無法生成唯一邀請碼，請稍後再試');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { inviteCode: code },
      select: {
        id: true,
        nickname: true,
        inviteCode: true,
        customInviterReward: true,
        customInviteeReward: true,
      },
    });
  }

  // 取得用戶的邀請統計
  async getUserInviteStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        inviteCode: true,
        customInviterReward: true,
        customInviteeReward: true,
        invitedById: true,
        invitedBy: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    const inviteHistory = await this.prisma.inviteHistory.findMany({
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

    const completedInvites = inviteHistory.filter(h => h.status === 'completed');
    const totalRewards = completedInvites.reduce((sum, h) => sum + h.inviterReward, 0);

    const settings = await this.getInviteSettings();

    return {
      inviteCode: user.inviteCode,
      customInviterReward: user.customInviterReward,
      customInviteeReward: user.customInviteeReward,
      effectiveInviterReward: user.customInviterReward ?? settings.defaultInviterReward,
      effectiveInviteeReward: user.customInviteeReward ?? settings.defaultInviteeReward,
      invitedBy: user.invitedBy,
      inviteCount: completedInvites.length,
      pendingCount: inviteHistory.filter(h => h.status === 'pending').length,
      totalRewards,
      inviteHistory: inviteHistory.map(h => ({
        id: h.id,
        inviteeNickname: h.invitee.nickname || '匿名用戶',
        status: h.status,
        inviterReward: h.inviterReward,
        inviteeReward: h.inviteeReward,
        createdAt: h.createdAt,
        rewardedAt: h.rewardedAt,
      })),
    };
  }
}
