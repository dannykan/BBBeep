import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserType, VehicleType } from '@prisma/client';
import { normalizeLicensePlate } from '../common/utils/license-plate-format';

const ADMIN_PASSWORD = '12345678';

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
    const where: any = {};
    if (userType) {
      where.userType = userType;
    }
    // 排除臨時用戶（temp_ 開頭的手機號）
    // 但要包含 LINE 用戶（phone 為 null）
    where.OR = [
      { phone: null }, // LINE 用戶
      { phone: { not: { startsWith: 'temp_' } } }, // 非臨時用戶
    ];
    // 同時排除 unbound_ 開頭的未綁定車牌用戶
    where.NOT = [
      { phone: { startsWith: 'unbound_' } },
    ];

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
}
