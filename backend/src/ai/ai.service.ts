import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { AIPromptService } from './ai-prompt.service';
import { VehicleType } from '@prisma/client';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private openai: OpenAI | null = null;
  private googleAi: GoogleGenerativeAI | null = null;
  private aiProvider: 'openai' | 'google' | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private pointsService: PointsService,
    private aiPromptService: AIPromptService,
  ) {
    // 初始化 AI 服務（優先使用 OpenAI，如果沒有則使用 Google AI）
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    const googleAiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');

    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.aiProvider = 'openai';
    } else if (googleAiKey) {
      this.googleAi = new GoogleGenerativeAI(googleAiKey);
      this.aiProvider = 'google';
    }
  }

  async checkDailyLimit(userId: string): Promise<{ canUse: boolean; remaining: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayUsage = await this.prisma.aIUsageLog.count({
      where: {
        userId,
        resetDate: {
          gte: today,
        },
      },
    });

    const remaining = Math.max(0, 5 - todayUsage);
    return {
      canUse: remaining > 0,
      remaining,
    };
  }

  async rewrite(
    userId: string,
    text: string,
    vehicleType?: VehicleType,
    category?: string,
  ): Promise<string> {
    // 檢查每日限制
    const limitCheck = await this.checkDailyLimit(userId);
    if (!limitCheck.canUse) {
      throw new BadRequestException('今日 AI 改寫次數已用盡，請明天再試');
    }

    // 檢查點數（AI改寫需要1點）
    const points = await this.pointsService.getPoints(userId);
    if (points < 1) {
      throw new BadRequestException('點數不足，無法使用 AI 改寫功能');
    }

    let rewrittenText: string;
    let promptTemplate: string;

    // 獲取對應的 prompt
    if (vehicleType && category) {
      promptTemplate = await this.aiPromptService.getPrompt(vehicleType, category);
    } else {
      promptTemplate = await this.aiPromptService.getPrompt('car', '其他情況');
    }

    try {
      if (this.aiProvider === 'openai' && this.openai) {
        rewrittenText = await this.rewriteWithOpenAI(text, promptTemplate);
      } else if (this.aiProvider === 'google' && this.googleAi) {
        rewrittenText = await this.rewriteWithGoogleAI(text, promptTemplate);
      } else {
        throw new BadRequestException('AI 服務未配置');
      }

      // 扣除點數
      await this.pointsService.deductPoints(userId, 1, {
        type: 'spend',
        description: '使用 AI 改寫功能',
      });

      // 記錄使用
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await this.prisma.aIUsageLog.create({
        data: {
          userId,
          resetDate: today,
        },
      });

      return rewrittenText;
    } catch (error) {
      throw new BadRequestException(`AI 改寫失敗: ${error.message}`);
    }
  }

  private async rewriteWithOpenAI(text: string, promptTemplate: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI 未初始化');
    }

    // 解析 prompt 模板
    // 如果包含 {text}，则替换；否则作为 system message，text 作为 user message
    let systemPrompt = '你是一個友善的助手，專門將用戶的文字改寫為更溫和、禮貌的語氣。請保持原意，但使用更溫和的表達方式。只返回改寫後的文字，不要添加任何解釋。';
    let userPrompt = `請將以下文字改寫為更溫和的語氣：${text}`;

    if (promptTemplate.includes('{text}')) {
      // 如果 prompt 包含 {text}，尝试分离 system 和 user 部分
      const parts = promptTemplate.split('{text}');
      if (parts.length === 2) {
        systemPrompt = parts[0].trim() || systemPrompt;
        userPrompt = parts[0] + text + (parts[1] || '');
      } else {
        userPrompt = promptTemplate.replace('{text}', text);
      }
    } else {
      // 如果没有 {text}，整个 prompt 作为 system message
      systemPrompt = promptTemplate;
      userPrompt = text;
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content?.trim() || text;
  }

  private async rewriteWithGoogleAI(text: string, promptTemplate: string): Promise<string> {
    if (!this.googleAi) {
      throw new Error('Google AI 未初始化');
    }

    const prompt = promptTemplate.replace('{text}', text);
    const model = this.googleAi.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  }
}
