import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageType, PointHistoryType } from '@prisma/client';
import { toChineseType, toPrismaType, MessageTypeChinese } from '../common/utils/message-type-mapper';
import { normalizeLicensePlate } from '../common/utils/license-plate-format';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private pointsService: PointsService,
  ) {}

  async create(userId: string, dto: CreateMessageDto) {
    // 格式化車牌號碼（統一格式，去除分隔符）
    const normalizedPlate = normalizeLicensePlate(dto.licensePlate);
    if (!normalizedPlate) {
      throw new BadRequestException('車牌號碼格式無效');
    }

    // 查找接收者（使用格式化後的車牌）
    let receiver = await this.prisma.user.findFirst({
      where: {
        licensePlate: normalizedPlate,
        userType: 'driver',
      },
    });

    // 如果找不到用戶，為該車牌創建一個臨時用戶記錄
    // 等該車牌用戶註冊時會自動關聯到這個記錄
    if (!receiver) {
      // 先檢查是否已經有該車牌的臨時用戶（使用格式化後的車牌）
      const existingTempUsers = await this.prisma.user.findMany({
        where: {
          licensePlate: normalizedPlate,
        },
      });
      
      const existingTempUser = existingTempUsers.find(u => u.phone.startsWith('temp_') || u.phone.startsWith('unbound_'));
      
      if (existingTempUser) {
        // 如果已有臨時用戶，使用現有的
        receiver = existingTempUser;
      } else {
        // 判斷車種（根據車牌長度：7位通常是汽車，6位可能是機車或汽車）
        const vehicleType = normalizedPlate.length === 7 ? 'car' : normalizedPlate.length === 6 && /^[A-Z]{3}[0-9]{3}$/.test(normalizedPlate) ? 'scooter' : 'car';
        
        // 創建未綁定車牌用戶（使用 unbound_ 前綴，以便 Admin 平台識別）
        receiver = await this.prisma.user.create({
          data: {
            phone: `unbound_${normalizedPlate}_${Date.now()}`, // 未綁定電話號碼，註冊時會更新
            licensePlate: normalizedPlate, // 使用格式化後的車牌（不含分隔符）
            userType: 'driver',
            vehicleType: vehicleType,
            points: 0,
            hasCompletedOnboarding: false, // 標記為未完成註冊的臨時用戶
          },
        });
      }
    }

    if (receiver.id === userId) {
      throw new BadRequestException('無法發送提醒給自己');
    }

    // 檢查單一用戶對同一車牌，1天內是否已發送過提醒
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const recentMessage = await this.prisma.message.findFirst({
      where: {
        senderId: userId,
        receiverId: receiver.id,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (recentMessage) {
      throw new BadRequestException('您今天已經對此車牌發送過提醒，請明天再試');
    }

    // 檢查是否被封鎖或拒收
    const isBlocked = await this.prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: receiver.id,
          blockedId: userId,
        },
      },
    });

    if (isBlocked) {
      throw new ForbiddenException('您已被該用戶封鎖');
    }

    const isRejected = await this.prisma.rejectedUser.findUnique({
      where: {
        rejecterId_rejectedId: {
          rejecterId: receiver.id,
          rejectedId: userId,
        },
      },
    });

    if (isRejected) {
      throw new ForbiddenException('該用戶已拒收您的提醒');
    }

    // 轉換中文字符串為 Prisma enum
    const prismaType = typeof dto.type === 'string' 
      ? toPrismaType(dto.type as MessageTypeChinese)
      : dto.type as MessageType;

    // 計算點數消耗
    let pointCost = 0;
    if (prismaType === MessageType.PRAISE) {
      // 讚美是免費的，還會獲得1點
      pointCost = 0;
    } else {
      // 車況提醒或行車安全提醒：基礎1點
      pointCost = 1;
      
      // 如果有補充文字：+3點
      if (dto.customText) {
        pointCost += 3;
      }
      
      // 如果使用AI改寫：+1點
      if (dto.useAiRewrite) {
        pointCost += 1;
      }
    }

    // 檢查點數
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!sender) {
      throw new NotFoundException('發送者不存在');
    }

    if (sender.points < pointCost) {
      throw new BadRequestException('點數不足');
    }

    // 扣除點數（讚美除外）
    if (pointCost > 0) {
      await this.pointsService.deductPoints(userId, pointCost, {
        type: 'spend',
        description: this.getPointDescription(prismaType, !!dto.customText, !!dto.useAiRewrite),
      });
    }

    // 創建訊息
    const message = await this.prisma.message.create({
      data: {
        type: prismaType,
        template: dto.template,
        customText: dto.customText,
        senderId: userId,
        receiverId: receiver.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    // 如果是讚美，給接收者加1點
    if (prismaType === MessageType.PRAISE) {
      await this.pointsService.addPoints(receiver.id, 1, {
        type: 'earn',
        description: '收到讚美回饋',
      });
    }

    // 轉換為中文返回
    return {
      ...message,
      type: toChineseType(message.type),
    };
  }

  async findAll(userId: string, unreadOnly?: boolean) {
    const where: any = {
      receiverId: userId,
    };

    if (unreadOnly) {
      where.read = false;
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 轉換為中文返回
    return messages.map(msg => ({
      ...msg,
      type: toChineseType(msg.type),
    }));
  }

  async findSent(userId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        senderId: userId,
      },
      include: {
        receiver: {
          select: {
            id: true,
            nickname: true,
            licensePlate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 轉換為中文返回
    return messages.map(msg => ({
      ...msg,
      type: toChineseType(msg.type),
    }));
  }

  async findOne(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('訊息不存在');
    }

    if (message.receiverId !== userId) {
      throw new ForbiddenException('無權限查看此訊息');
    }

    // 標記為已讀
    if (!message.read) {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { read: true },
      });
    }

    // 轉換為中文返回
    return {
      ...message,
      type: toChineseType(message.type),
    };
  }

  async markAsRead(userId: string, messageId: string) {
    const existingMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage || existingMessage.receiverId !== userId) {
      throw new NotFoundException('訊息不存在');
    }

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { read: true },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    // 轉換為中文返回
    return {
      ...updatedMessage,
      type: toChineseType(updatedMessage.type),
    };
  }

  async replyToMessage(userId: string, messageId: string, replyText: string) {
    const existingMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage || existingMessage.receiverId !== userId) {
      throw new NotFoundException('訊息不存在');
    }

    // 更新回覆內容（僅供記錄，不會通知發送者）
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { replyText },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    // 轉換為中文返回
    return {
      ...updatedMessage,
      type: toChineseType(updatedMessage.type),
    };
  }

  async reportMessage(userId: string, messageId: string, reason?: string) {
    const existingMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    if (!existingMessage || existingMessage.receiverId !== userId) {
      throw new NotFoundException('訊息不存在');
    }

    // 檢查是否已經檢舉過
    const existingReport = await this.prisma.messageReport.findUnique({
      where: {
        messageId_reporterId: {
          messageId,
          reporterId: userId,
        },
      },
    });

    if (existingReport) {
      throw new BadRequestException('您已經檢舉過此訊息');
    }

    // 創建檢舉記錄
    await this.prisma.messageReport.create({
      data: {
        messageId,
        reporterId: userId,
        reason: reason || null,
        status: 'pending',
      },
    });

    return {
      message: '檢舉已提交，我們會儘快處理',
    };
  }

  private getPointDescription(
    type: MessageType,
    hasCustomText?: boolean,
    useAiRewrite?: boolean,
  ): string {
    const chineseType = toChineseType(type);
    let desc = `發送${chineseType}`;
    if (hasCustomText) {
      desc += '（含補充文字）';
    }
    if (useAiRewrite) {
      desc += '（AI 協助）';
    }
    return desc;
  }
}
