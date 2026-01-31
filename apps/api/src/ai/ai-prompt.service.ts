import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { VehicleType } from '@prisma/client';

@Injectable()
export class AIPromptService {
  constructor(private prisma: PrismaService) {}

  async getPrompt(vehicleType: VehicleType, category: string): Promise<string> {
    const prompt = await this.prisma.aIPrompt.findUnique({
      where: {
        vehicleType_category: {
          vehicleType,
          category,
        },
        isActive: true,
      },
    });

    // 如果没有找到，返回默认 prompt
    return prompt?.prompt || this.getDefaultPrompt();
  }

  private getDefaultPrompt(): string {
    return '請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n{text}';
  }

  async getAllPrompts() {
    return this.prisma.aIPrompt.findMany({
      orderBy: [{ vehicleType: 'asc' }, { category: 'asc' }],
    });
  }

  async updatePrompt(vehicleType: VehicleType, category: string, prompt: string) {
    return this.prisma.aIPrompt.upsert({
      where: {
        vehicleType_category: {
          vehicleType,
          category,
        },
      },
      update: {
        prompt,
        updatedAt: new Date(),
      },
      create: {
        vehicleType,
        category,
        prompt,
      },
    });
  }
}
