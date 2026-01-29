import { Injectable } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'BBBeeep API is running!';
  }

  async getAppContent() {
    try {
      let content = await this.prisma.appContent.findFirst();
      if (!content) {
        content = await this.prisma.appContent.create({
          data: {},
        });
      }
      return content;
    } catch (error) {
      // 如果資料庫操作失敗，返回預設值而不是拋出錯誤
      console.error('[APP_CONTENT] Failed to get/create content:', error);
      return {
        id: 'default',
        landingTagline: null,
        landingSubtext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }
}
