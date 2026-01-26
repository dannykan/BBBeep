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

  async resetDailyLimit(userId: string): Promise<{ canUse: boolean; remaining: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 刪除今日的 AI 使用紀錄，重置為 5 次
    await this.prisma.aIUsageLog.deleteMany({
      where: {
        userId,
        resetDate: {
          gte: today,
        },
      },
    });

    return {
      canUse: true,
      remaining: 5,
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

    // 注意：AI 改寫不扣點，點數在實際發送訊息時才扣除
    // 這裡只檢查用戶是否有足夠點數發送（至少需要 2 點用於 AI 優化訊息）
    const points = await this.pointsService.getPoints(userId);
    if (points < 2) {
      throw new BadRequestException('點數不足，無法使用 AI 改寫功能（發送需要 2 點）');
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

      // 注意：不在這裡扣點，點數在訊息發送時扣除

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

  /**
   * AI 內容審核
   * 分析文字是否適合在提醒平台發送
   */
  async moderateContent(text: string): Promise<{
    isAppropriate: boolean;
    reason: string | null;
    category: 'ok' | 'emotional' | 'inappropriate' | 'dangerous';
    suggestion: string | null;
  }> {
    if (!this.openai) {
      // 如果沒有 AI，回傳預設通過
      return {
        isAppropriate: true,
        reason: null,
        category: 'ok',
        suggestion: null,
      };
    }

    const systemPrompt = `你是一個內容審核助手，專門為台灣的「路上提醒平台」審核訊息內容。

這個平台讓用戶透過車牌號碼發送提醒給其他駕駛，例如：車燈沒關、輪胎沒氣、行車安全提醒等。

你的任務是分析用戶輸入的內容，判斷是否適合直接發送，或需要經過 AI 優化。

## 判斷標準

### ✅ 適合直接發送 (category: "ok", isAppropriate: true)
- 善意的提醒或建議
- 表達感謝或讚美
- 描述客觀事實，語氣平和（如：您好，您的車燈沒關）
- 禮貌的行車安全提醒（如：剛剛您切換車道時有點危險，請小心）

### ⚠️ 含有情緒或粗話，需要優化 (category: "emotional", isAppropriate: false)
- 帶有任何髒話或粗話（如：靠北、他媽的、三小、幹、機掰、白目、87、智障）
- 帶有質疑或攻擊性語氣（如：會不會開車？、眼睛長在哪？、是在哈囉？）
- 使用台灣口語表達不滿或情緒發洩
- 語氣不友善或帶有諷刺意味
- 這類內容建議用 AI 優化後再發送，讓訊息更專業友善

### ❌ 不適合發送 (category: "inappropriate", isAppropriate: false)
- 人身攻擊或歧視言論（如：女人開車就是爛、老人不要出來害人）
- 索取或提供聯繫方式（如：加我 LINE、打給我）
- 與交通無關的騷擾內容

### 🚫 危險內容 (category: "dangerous", isAppropriate: false)
- 威脅傷害對方（如：等著瞧、找人修理你、弄死你）
- 暴力或犯罪相關

## 重要提醒
- 只要內容包含任何粗話、髒話、不禮貌的用語，都應該標記為 "emotional"，isAppropriate 設為 false
- 「靠北」、「三小」、「幹」、「機掰」、「白目」等台灣常見粗話都要標記
- 質疑對方駕駛能力的問句（如「會不會開車」）也是情緒性內容

## 回應格式
請用 JSON 格式回應：
{
  "isAppropriate": boolean,  // 只有 category 為 "ok" 時才是 true
  "category": "ok" | "emotional" | "inappropriate" | "dangerous",
  "reason": "簡短說明原因（必填，即使是 ok 也要說明）",
  "suggestion": "如果是 emotional，說明建議用 AI 優化讓訊息更友善；其他情況可為 null"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // 使用較快的模型
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `請審核以下內容：\n\n${text}` },
        ],
        temperature: 0.1, // 低溫度確保一致性
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { isAppropriate: true, reason: null, category: 'ok', suggestion: null };
      }

      const result = JSON.parse(content);
      return {
        isAppropriate: result.isAppropriate ?? true,
        reason: result.reason ?? null,
        category: result.category ?? 'ok',
        suggestion: result.suggestion ?? null,
      };
    } catch (error) {
      console.error('AI moderation error:', error);
      // 出錯時預設通過，避免阻擋用戶
      return { isAppropriate: true, reason: null, category: 'ok', suggestion: null };
    }
  }
}
