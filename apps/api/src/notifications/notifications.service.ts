import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DevicePlatform, NotificationType } from '@prisma/client';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(private prisma: PrismaService) {}

  /**
   * 註冊裝置 Token
   */
  async registerDevice(
    userId: string,
    token: string,
    platform: DevicePlatform,
  ) {
    // 先將該 token 從其他用戶移除（如果存在）
    await this.prisma.deviceToken.updateMany({
      where: {
        token,
        userId: { not: userId },
      },
      data: { isActive: false },
    });

    // 更新或創建裝置 token
    return this.prisma.deviceToken.upsert({
      where: {
        userId_token: {
          userId,
          token,
        },
      },
      update: {
        platform,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        token,
        platform,
        isActive: true,
      },
    });
  }

  /**
   * 移除裝置 Token
   */
  async unregisterDevice(userId: string, token: string) {
    return this.prisma.deviceToken.updateMany({
      where: {
        userId,
        token,
      },
      data: { isActive: false },
    });
  }

  /**
   * 取得用戶的所有有效裝置 Token
   */
  async getUserDeviceTokens(userId: string): Promise<string[]> {
    const devices = await this.prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: { token: true },
    });
    return devices.map((d) => d.token);
  }

  /**
   * 發送推播通知給單一用戶
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    const tokens = await this.getUserDeviceTokens(userId);

    if (tokens.length === 0) {
      this.logger.debug(`User ${userId} has no registered device tokens`);
      return { success: true, sent: 0, failed: 0 };
    }

    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title,
      body,
      data,
      sound: 'default' as const,
    }));

    return this.sendPushNotifications(messages);
  }

  /**
   * 發送新提醒通知
   */
  async sendNewMessageNotification(
    receiverId: string,
    messageId: string,
    messageType: string,
    senderNickname?: string,
  ) {
    const typeLabels: Record<string, string> = {
      VEHICLE_REMINDER: '車況提醒',
      SAFETY_REMINDER: '行車安全提醒',
      PRAISE: '讚美感謝',
    };

    const typeLabel = typeLabels[messageType] || '提醒';
    const title = '你收到一則新提醒';
    const body = senderNickname
      ? `${senderNickname} 給你發了一則${typeLabel}`
      : `有人給你發了一則${typeLabel}`;

    const result = await this.sendToUser(receiverId, title, body, {
      type: 'message',
      messageId,
    });

    // 記錄推播日誌
    await this.logNotification(
      NotificationType.message,
      title,
      body,
      [receiverId],
      result.sent,
      result.failed,
      { messageId },
    );

    return result;
  }

  /**
   * 發送回覆通知給發送者
   */
  async sendReplyNotification(
    senderId: string,
    messageId: string,
    replierNickname?: string,
  ) {
    const title = '你收到一則回覆';
    const body = replierNickname
      ? `${replierNickname} 回覆了你的提醒`
      : '有人回覆了你的提醒';

    const result = await this.sendToUser(senderId, title, body, {
      type: 'reply',
      messageId,
    });

    // 記錄推播日誌
    await this.logNotification(
      NotificationType.reply,
      title,
      body,
      [senderId],
      result.sent,
      result.failed,
      { messageId },
    );

    return result;
  }

  /**
   * Admin 推播給所有用戶
   */
  async sendBroadcast(
    title: string,
    body: string,
    adminId: string,
    data?: Record<string, any>,
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    // 取得所有有效的裝置 token
    const devices = await this.prisma.deviceToken.findMany({
      where: { isActive: true },
      select: { token: true, userId: true },
    });

    if (devices.length === 0) {
      this.logger.debug('No active device tokens for broadcast');
      return { success: true, sent: 0, failed: 0 };
    }

    const messages: ExpoPushMessage[] = devices.map((device) => ({
      to: device.token,
      title,
      body,
      data: { ...data, type: 'broadcast' },
      sound: 'default' as const,
    }));

    const result = await this.sendPushNotifications(messages);

    // 記錄推播日誌
    await this.logNotification(
      NotificationType.broadcast,
      title,
      body,
      [], // 空陣列表示全體用戶
      result.sent,
      result.failed,
      data,
      adminId,
    );

    return result;
  }

  /**
   * Admin 推播給指定用戶
   */
  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    adminId: string,
    data?: Record<string, any>,
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    // 取得指定用戶的所有有效裝置 token
    const devices = await this.prisma.deviceToken.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
      select: { token: true },
    });

    if (devices.length === 0) {
      this.logger.debug('No active device tokens for selected users');
      return { success: true, sent: 0, failed: 0 };
    }

    const messages: ExpoPushMessage[] = devices.map((device) => ({
      to: device.token,
      title,
      body,
      data: { ...data, type: 'broadcast' },
      sound: 'default' as const,
    }));

    const result = await this.sendPushNotifications(messages);

    // 記錄推播日誌
    await this.logNotification(
      NotificationType.broadcast,
      title,
      body,
      userIds,
      result.sent,
      result.failed,
      data,
      adminId,
    );

    return result;
  }

  /**
   * 發送推播通知到 Expo Push API
   */
  private async sendPushNotifications(
    messages: ExpoPushMessage[],
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    if (messages.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    // Expo Push API 每次最多 100 個通知
    const chunks = this.chunkArray(messages, 100);
    let totalSent = 0;
    let totalFailed = 0;

    for (const chunk of chunks) {
      try {
        const response = await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();
        const tickets: ExpoPushTicket[] = result.data || [];

        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'ok') {
            totalSent++;
          } else {
            totalFailed++;
            this.logger.warn(
              `Push notification failed for token ${chunk[i].to}: ${ticket.message}`,
            );

            // 如果是無效的 token，標記為 inactive
            if (
              ticket.details?.error === 'DeviceNotRegistered' ||
              ticket.details?.error === 'InvalidCredentials'
            ) {
              await this.prisma.deviceToken.updateMany({
                where: { token: chunk[i].to },
                data: { isActive: false },
              });
            }
          }
        }
      } catch (error) {
        this.logger.error('Failed to send push notifications', error);
        totalFailed += chunk.length;
      }
    }

    return {
      success: totalFailed === 0,
      sent: totalSent,
      failed: totalFailed,
    };
  }

  /**
   * 記錄推播日誌
   */
  private async logNotification(
    type: NotificationType,
    title: string,
    body: string,
    targetUserIds: string[],
    successCount: number,
    failureCount: number,
    data?: Record<string, any>,
    sentBy?: string,
  ) {
    return this.prisma.notificationLog.create({
      data: {
        type,
        title,
        body,
        targetUserIds,
        successCount,
        failureCount,
        data: data || undefined,
        sentBy,
      },
    });
  }

  /**
   * 取得推播日誌
   */
  async getNotificationLogs(options?: {
    type?: NotificationType;
    limit?: number;
    offset?: number;
  }) {
    const where = options?.type ? { type: options.type } : {};

    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * 將陣列分割成小塊
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
