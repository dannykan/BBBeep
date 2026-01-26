import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivityType, Prisma } from '@prisma/client';

export interface CreateActivityDto {
  type: ActivityType;
  messageText?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  transcript?: string;
  aiModerationResult?: any;
  targetPlate?: string;
  vehicleType?: string;
  category?: string;
  sendMode?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  metadata?: any;
  isSent?: boolean;
  messageId?: string;
}

export interface ActivityStats {
  totalActivities: number;
  totalRecordings: number;
  totalTextEdits: number;
  totalAiOptimize: number;
  totalSent: number;
  sendRate: number;
  topPhrases: { phrase: string; count: number }[];
  activitiesByDay: { date: string; count: number }[];
  activitiesByType: { type: string; count: number }[];
}

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  // 建立活動記錄
  async create(userId: string, data: CreateActivityDto) {
    return this.prisma.userActivity.create({
      data: {
        userId,
        type: data.type,
        messageText: data.messageText,
        voiceUrl: data.voiceUrl,
        voiceDuration: data.voiceDuration,
        transcript: data.transcript,
        aiModerationResult: data.aiModerationResult,
        targetPlate: data.targetPlate,
        vehicleType: data.vehicleType,
        category: data.category,
        sendMode: data.sendMode,
        latitude: data.latitude,
        longitude: data.longitude,
        location: data.location,
        metadata: data.metadata,
        isSent: data.isSent ?? false,
        messageId: data.messageId,
      },
    });
  }

  // 取得所有活動（分頁、搜尋）
  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    type?: ActivityType;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page = 1, limit = 50, search, type, userId, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.UserActivityWhereInput = {};

    if (type) {
      where.type = type;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { messageText: { contains: search, mode: 'insensitive' } },
        { transcript: { contains: search, mode: 'insensitive' } },
        { targetPlate: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              nickname: true,
              licensePlate: true,
            },
          },
        },
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 取得用戶的活動記錄
  async findByUser(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userActivity.count({ where: { userId } }),
    ]);

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 取得統計資料
  async getStats(options: { startDate?: Date; endDate?: Date } = {}): Promise<ActivityStats> {
    const { startDate, endDate } = options;

    const where: Prisma.UserActivityWhereInput = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // 基本統計
    const [
      totalActivities,
      totalRecordings,
      totalTextEdits,
      totalAiOptimize,
      totalSent,
    ] = await Promise.all([
      this.prisma.userActivity.count({ where }),
      this.prisma.userActivity.count({ where: { ...where, type: 'RECORDING_COMPLETE' } }),
      this.prisma.userActivity.count({ where: { ...where, type: 'TEXT_EDIT' } }),
      this.prisma.userActivity.count({ where: { ...where, type: 'AI_OPTIMIZE' } }),
      this.prisma.userActivity.count({ where: { ...where, isSent: true } }),
    ]);

    const sendRate = totalActivities > 0 ? (totalSent / totalActivities) * 100 : 0;

    // 按類型統計
    const activitiesByType = await this.prisma.userActivity.groupBy({
      by: ['type'],
      where,
      _count: { id: true },
    });

    // 按日統計（最近 30 天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activitiesByDay = await this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM "UserActivity"
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // 熱門詞彙分析（從 messageText 和 transcript 中提取）
    const allTexts = await this.prisma.userActivity.findMany({
      where: {
        ...where,
        OR: [
          { messageText: { not: null } },
          { transcript: { not: null } },
        ],
      },
      select: {
        messageText: true,
        transcript: true,
      },
      take: 1000, // 限制樣本數
    });

    const phraseCount = new Map<string, number>();
    for (const item of allTexts) {
      const text = item.messageText || item.transcript || '';
      // 簡單的詞頻統計（可以之後改用更好的 NLP）
      const words = text.split(/[\s，。！？、]+/).filter(w => w.length >= 2);
      for (const word of words) {
        phraseCount.set(word, (phraseCount.get(word) || 0) + 1);
      }
    }

    const topPhrases = Array.from(phraseCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([phrase, count]) => ({ phrase, count }));

    return {
      totalActivities,
      totalRecordings,
      totalTextEdits,
      totalAiOptimize,
      totalSent,
      sendRate: Math.round(sendRate * 100) / 100,
      topPhrases,
      activitiesByDay: activitiesByDay.map(d => ({
        date: d.date,
        count: Number(d.count),
      })),
      activitiesByType: activitiesByType.map(t => ({
        type: t.type,
        count: t._count.id,
      })),
    };
  }

  // 即時活動流
  async getRecentActivities(limit: number = 50) {
    return this.prisma.userActivity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
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

  // 標記活動為已發送
  async markAsSent(activityId: string, messageId: string) {
    return this.prisma.userActivity.update({
      where: { id: activityId },
      data: { isSent: true, messageId },
    });
  }
}
