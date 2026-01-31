import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { InviteService } from '../invite/invite.service';
import { UpdateUserDto, CompleteOnboardingDto } from './dto/update-user.dto';
import { BlockUserDto, RejectUserDto } from './dto/block-user.dto';
import { CreateLicensePlateApplicationDto } from './dto/license-plate-application.dto';
import { normalizeLicensePlate } from '../common/utils/license-plate-format';
import { POINTS_CONFIG, isInTrialPeriod } from '../config/points.config';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private pointsService: PointsService,
    @Inject(forwardRef(() => InviteService))
    private inviteService: InviteService,
  ) {}

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        blockedUsers: {
          include: {
            blocked: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
        rejectedUsers: {
          include: {
            rejected: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    return user;
  }

  async update(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async checkLicensePlateAvailability(licensePlate: string) {
    // 格式化車牌（去除分隔符）
    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!normalizedPlate) {
      throw new BadRequestException('車牌號碼格式無效');
    }

    // 查找該車牌的所有用戶（包括臨時用戶）
    const usersWithPlate = await this.prisma.user.findMany({
      where: {
        licensePlate: normalizedPlate,
      },
      select: {
        id: true,
        phone: true,
        hasCompletedOnboarding: true,
        appleUserId: true,
        lineUserId: true,
      },
    });

    // 檢查是否有已完成的用戶（非臨時用戶）
    const completedUser = usersWithPlate.find(
      (user) => user.hasCompletedOnboarding && !user.phone.startsWith('temp_'),
    );

    if (completedUser) {
      // 判斷註冊方式
      let authProvider: 'apple' | 'line' | undefined;
      if (completedUser.appleUserId) {
        authProvider = 'apple';
      } else if (completedUser.lineUserId) {
        authProvider = 'line';
      }

      return {
        available: false,
        isBound: true,
        authProvider,
      };
    }

    // 檢查是否有待審核的申請
    const pendingApplication = await this.prisma.licensePlateApplication.findFirst({
      where: {
        licensePlate: normalizedPlate,
        status: 'pending',
      },
    });

    if (pendingApplication) {
      return {
        available: false,
        isBound: false,
        hasPendingApplication: true,
      };
    }

    return {
      available: true,
      isBound: false,
    };
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('用戶不存在');
    }

    // 如果用戶填寫了車牌，檢查是否可用
    if (dto.licensePlate) {
      // 格式化車牌（去除分隔符）
      const normalizedPlate = normalizeLicensePlate(dto.licensePlate);
      if (!normalizedPlate) {
        throw new BadRequestException('車牌號碼格式無效');
      }

      // 檢查車牌是否已被綁定（非臨時用戶）
      const checkResult = await this.checkLicensePlateAvailability(normalizedPlate);

      if (checkResult.isBound) {
        throw new BadRequestException('該車牌已被其他帳號綁定，無法重複綁定');
      }

      // 查找該車牌的臨時用戶（phone 以 temp_ 或 unbound_ 開頭）
      const allUsersWithPlate = await this.prisma.user.findMany({
        where: {
          licensePlate: normalizedPlate,
          id: { not: userId }, // 排除當前用戶
        },
      });

      // 找到臨時用戶（phone 以 temp_ 或 unbound_ 開頭）
      const tempUser = allUsersWithPlate.find(
        (user) => user.phone.startsWith('temp_') || user.phone.startsWith('unbound_'),
      );

      // 如果找到臨時用戶，合併數據
      if (tempUser) {
        // 將臨時用戶收到的消息轉移到當前用戶
        await this.prisma.message.updateMany({
          where: { receiverId: tempUser.id },
          data: { receiverId: userId },
        });

        // 將臨時用戶的點數轉移（如果有）
        if (tempUser.points > 0) {
          await this.prisma.pointHistory.create({
            data: {
              userId: userId,
              type: 'bonus',
              amount: tempUser.points,
              description: '從臨時帳戶轉移的點數',
            },
          });
        }

        // 更新當前用戶的點數（保持購買點數不變）
        const updatedPoints = (currentUser.points || 0) + tempUser.points;

        // 更新當前用戶，使用臨時用戶的車牌信息
        // 設定試用期開始，給予試用初始點數（到 trialPoints，不是 points）
        const trialInitialPoints = POINTS_CONFIG.trial.enabled
          ? POINTS_CONFIG.trial.initialPoints
          : 0;
        const updatedUser = await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...dto,
            licensePlate: normalizedPlate, // 使用格式化後的車牌（不含分隔符）
            points: updatedPoints, // 購買/轉移點數保持獨立
            trialPoints: trialInitialPoints, // 試用點數獨立存放
            hasCompletedOnboarding: true,
            trialStartDate: POINTS_CONFIG.trial.enabled ? new Date() : null,
          },
        });

        // 記錄試用期點數
        if (trialInitialPoints > 0) {
          await this.prisma.pointHistory.create({
            data: {
              userId: userId,
              type: 'bonus',
              amount: trialInitialPoints,
              description: '試用期初始點數',
            },
          });
        }

        // 刪除臨時用戶
        await this.prisma.user.delete({
          where: { id: tempUser.id },
        });

        // 處理邀請獎勵
        await this.inviteService.processInviteReward(userId);

        return updatedUser;
      }
    }

    // 如果沒有臨時用戶，正常更新
    const updateData: any = { ...dto, hasCompletedOnboarding: true };
    if (dto.licensePlate) {
      const normalizedPlate = normalizeLicensePlate(dto.licensePlate);
      if (!normalizedPlate) {
        throw new BadRequestException('車牌號碼格式無效');
      }
      updateData.licensePlate = normalizedPlate;
    }

    // 設定試用期開始，給予試用初始點數（到 trialPoints，不影響 points）
    if (POINTS_CONFIG.trial.enabled) {
      updateData.trialStartDate = new Date();
      updateData.trialPoints = POINTS_CONFIG.trial.initialPoints; // 試用點數獨立存放
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 記錄試用期點數
    if (POINTS_CONFIG.trial.enabled && POINTS_CONFIG.trial.initialPoints > 0) {
      await this.prisma.pointHistory.create({
        data: {
          userId: userId,
          type: 'bonus',
          amount: POINTS_CONFIG.trial.initialPoints,
          description: '試用期初始點數',
        },
      });
    }

    // 處理邀請獎勵
    await this.inviteService.processInviteReward(userId);

    return user;
  }

  async findByLicensePlate(licensePlate: string) {
    // 格式化車牌（去除分隔符）
    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!normalizedPlate) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        licensePlate: normalizedPlate,
        userType: 'driver',
      },
      select: {
        id: true,
        nickname: true,
        licensePlate: true,
        userType: true,
        vehicleType: true,
      },
    });
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('無法封鎖自己');
    }

    const blocked = await this.prisma.user.findUnique({
      where: { id: blockedId },
    });

    if (!blocked) {
      throw new NotFoundException('用戶不存在');
    }

    // 檢查是否已經封鎖
    const existing = await this.prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.blockedUser.create({
      data: {
        blockerId,
        blockedId,
      },
      include: {
        blocked: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const blocked = await this.prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (!blocked) {
      throw new NotFoundException('未找到封鎖記錄');
    }

    await this.prisma.blockedUser.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    return { success: true };
  }

  async rejectUser(rejecterId: string, rejectedId: string) {
    if (rejecterId === rejectedId) {
      throw new BadRequestException('無法拒收自己');
    }

    const rejected = await this.prisma.user.findUnique({
      where: { id: rejectedId },
    });

    if (!rejected) {
      throw new NotFoundException('用戶不存在');
    }

    // 檢查是否已經拒收
    const existing = await this.prisma.rejectedUser.findUnique({
      where: {
        rejecterId_rejectedId: {
          rejecterId,
          rejectedId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.rejectedUser.create({
      data: {
        rejecterId,
        rejectedId,
      },
      include: {
        rejected: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });
  }

  async unrejectUser(rejecterId: string, rejectedId: string) {
    const rejected = await this.prisma.rejectedUser.findUnique({
      where: {
        rejecterId_rejectedId: {
          rejecterId,
          rejectedId,
        },
      },
    });

    if (!rejected) {
      throw new NotFoundException('未找到拒收記錄');
    }

    await this.prisma.rejectedUser.delete({
      where: {
        rejecterId_rejectedId: {
          rejecterId,
          rejectedId,
        },
      },
    });

    return { success: true };
  }

  async getBlockedList(userId: string) {
    return this.prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRejectedList(userId: string) {
    return this.prisma.rejectedUser.findMany({
      where: { rejecterId: userId },
      include: {
        rejected: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLicensePlateApplication(userId: string, dto: CreateLicensePlateApplicationDto) {
    // 格式化車牌（去除分隔符）
    const normalizedPlate = normalizeLicensePlate(dto.licensePlate);
    if (!normalizedPlate) {
      throw new BadRequestException('車牌號碼格式無效');
    }

    // 檢查是否已有待審核的申請
    const existingApplication = await this.prisma.licensePlateApplication.findFirst({
      where: {
        userId,
        licensePlate: normalizedPlate,
        status: 'pending',
      },
    });

    if (existingApplication) {
      throw new BadRequestException('您已有該車牌的待審核申請');
    }

    return this.prisma.licensePlateApplication.create({
      data: {
        userId,
        licensePlate: normalizedPlate, // 使用格式化後的車牌（不含分隔符）
        vehicleType: dto.vehicleType,
        licenseImage: dto.licenseImage,
        email: dto.email,
      },
    });
  }

  async getLicensePlateApplication(userId: string, applicationId: string) {
    const application = await this.prisma.licensePlateApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            nickname: true,
          },
        },
      },
    });

    if (!application || application.userId !== userId) {
      throw new NotFoundException('申請不存在');
    }

    return application;
  }

  async getMyLicensePlateApplications(userId: string) {
    return this.prisma.licensePlateApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 取得用戶試用期狀態
  async getTrialStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        trialStartDate: true,
        trialEndedProcessed: true,
        points: true,
        freePoints: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    const isInTrial = isInTrialPeriod(user.trialStartDate);
    const trialDurationDays = POINTS_CONFIG.trial.durationDays;

    // 計算剩餘天數
    let daysRemaining = 0;
    let trialEndDate: Date | null = null;

    if (user.trialStartDate && POINTS_CONFIG.trial.enabled) {
      trialEndDate = new Date(user.trialStartDate);
      trialEndDate.setDate(trialEndDate.getDate() + trialDurationDays);

      if (isInTrial) {
        const now = new Date();
        const diffMs = trialEndDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    return {
      isInTrial,
      trialStartDate: user.trialStartDate,
      trialEndDate,
      daysRemaining,
      trialDurationDays,
      trialEndedProcessed: user.trialEndedProcessed,
      trialConfig: {
        initialPoints: POINTS_CONFIG.trial.initialPoints,
        oneTimeBonusAfterTrial: POINTS_CONFIG.basic.oneTimeBonus.amount,
      },
    };
  }

  // 刪除帳戶（用戶自己刪除）
  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    // 刪除用戶相關的所有資料（使用 transaction 確保原子性）
    await this.prisma.$transaction(async (tx) => {
      // 1. 刪除點數歷史
      await tx.pointHistory.deleteMany({
        where: { userId },
      });

      // 2. 刪除 AI 使用記錄
      await tx.aIUsageLog.deleteMany({
        where: { userId },
      });

      // 3. 刪除封鎖/被封鎖記錄
      await tx.blockedUser.deleteMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      });

      // 4. 刪除拒收記錄
      await tx.rejectedUser.deleteMany({
        where: { OR: [{ rejecterId: userId }, { rejectedId: userId }] },
      });

      // 5. 刪除訊息檢舉記錄
      await tx.messageReport.deleteMany({
        where: { reporterId: userId },
      });

      // 6. 刪除車牌申請
      await tx.licensePlateApplication.deleteMany({
        where: { userId },
      });

      // 7. 刪除語音草稿
      await tx.voiceDraft.deleteMany({
        where: { userId },
      });

      // 8. 刪除收藏車牌
      await tx.savedPlate.deleteMany({
        where: { userId },
      });

      // 9. 刪除 IAP 交易記錄
      await tx.iAPTransaction.deleteMany({
        where: { userId },
      });

      // 10. 刪除通知設定
      await tx.notificationToken.deleteMany({
        where: { userId },
      });

      // 11. 刪除收到的和發送的訊息
      await tx.message.deleteMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      });

      // 12. 最後刪除用戶
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return { success: true, message: '帳戶已成功刪除' };
  }
}
