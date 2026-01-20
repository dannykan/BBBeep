import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateUserDto, CompleteOnboardingDto } from './dto/update-user.dto';
import { BlockUserDto, RejectUserDto } from './dto/block-user.dto';
import { CreateLicensePlateApplicationDto } from './dto/license-plate-application.dto';
import { normalizeLicensePlate } from '../common/utils/license-plate-format';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
        nickname: true,
        hasCompletedOnboarding: true,
      },
    });

    // 檢查是否有已完成的用戶（非臨時用戶）
    const completedUser = usersWithPlate.find(
      user => user.hasCompletedOnboarding && !user.phone.startsWith('temp_')
    );

    if (completedUser) {
      return {
        available: false,
        isBound: true,
        boundPhone: completedUser.phone,
        boundNickname: completedUser.nickname,
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
        throw new BadRequestException(
          `該車牌已被綁定到手機號碼 ${checkResult.boundPhone}，無法重複綁定`
        );
      }

      // 查找該車牌的臨時用戶（phone 以 temp_ 或 unbound_ 開頭）
      const allUsersWithPlate = await this.prisma.user.findMany({
        where: {
          licensePlate: normalizedPlate,
          id: { not: userId }, // 排除當前用戶
        },
      });
      
      // 找到臨時用戶（phone 以 temp_ 或 unbound_ 開頭）
      const tempUser = allUsersWithPlate.find(user => user.phone.startsWith('temp_') || user.phone.startsWith('unbound_'));

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

        // 更新當前用戶的點數
        const updatedPoints = (currentUser.points || 0) + tempUser.points;

        // 更新當前用戶，使用臨時用戶的車牌信息
        const updatedUser = await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...dto,
            licensePlate: normalizedPlate, // 使用格式化後的車牌（不含分隔符）
            points: updatedPoints,
            hasCompletedOnboarding: true,
          },
        });

        // 刪除臨時用戶
        await this.prisma.user.delete({
          where: { id: tempUser.id },
        });

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
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
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
}
