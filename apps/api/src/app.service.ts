import { Injectable } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'BBBeeep API is running!';
  }

  async getAppContent() {
    let content = await this.prisma.appContent.findFirst();
    if (!content) {
      content = await this.prisma.appContent.create({
        data: {},
      });
    }
    return content;
  }
}
