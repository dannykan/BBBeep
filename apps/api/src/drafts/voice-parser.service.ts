import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface ParsedPlate {
  plate: string;
  confidence: number;
}

export interface ParsedVehicle {
  type: 'car' | 'scooter' | 'unknown';
  color?: string;
  brand?: string;
  model?: string;
}

export interface ParsedEvent {
  category: 'VEHICLE_REMINDER' | 'SAFETY_REMINDER' | 'PRAISE' | 'OTHER';
  type: string;
  description: string;
  location?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface ParsedVoiceContent {
  plates: ParsedPlate[];
  vehicle: ParsedVehicle;
  event: ParsedEvent;
  suggestedMessage: string;
  rawAnalysis?: string;
}

@Injectable()
export class VoiceParserService {
  private readonly logger = new Logger(VoiceParserService.name);
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * 解析語音轉文字內容，提取車牌、車輛資訊、事件類型
   */
  async parseVoiceContent(transcript: string): Promise<ParsedVoiceContent> {
    const prompt = this.buildPrompt(transcript);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2, // 低溫度提高一致性
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      this.logger.debug(`AI Response: ${content}`);

      const parsed = JSON.parse(content);
      return this.normalizeResponse(parsed);
    } catch (error) {
      this.logger.error(`Failed to parse voice content: ${error.message}`);
      // 返回空結果，讓用戶手動輸入
      return {
        plates: [],
        vehicle: { type: 'unknown' },
        event: {
          category: 'OTHER',
          type: 'unknown',
          description: '無法自動識別',
          sentiment: 'neutral',
        },
        suggestedMessage: '',
      };
    }
  }

  /**
   * 單獨解析車牌（用於快速驗證）
   */
  async parsePlateOnly(transcript: string): Promise<ParsedPlate[]> {
    const prompt = `
你是台灣車牌辨識專家。從以下語音轉文字內容中提取可能的車牌號碼。

## 台灣車牌格式
- 汽車：AAA-0000、AA-0000、0000-AA
- 機車：AAA-000、000-AAA

## 口語轉換規則
字母常見念法：
- A: 阿、啊、誒
- B: 逼、比、ㄅㄧ
- C: 西、C、ㄒㄧ
- D: 滴、低、ㄉㄧ
- E: 伊、誒
- F: 誒福、ㄈㄨ
- G: 雞、乩、ㄐㄧ
- H: 誒曲、ㄏㄟ
- J: 乩誒、ㄐㄟ
- K: ㄎㄟ、K
- L: 誒偶、ㄌㄟ
- M: 誒母、ㄇㄨ
- N: 誒恩、ㄣ
- P: 批、ㄆㄧ
- Q: 乞、ㄑㄧㄡ
- R: 阿、ㄚ
- S: 誒死、ㄙ
- T: 踢、ㄊㄧ
- U: 優、ㄧㄡ
- V: 威、ㄨㄟ
- W: 搭波優、ㄉㄚㄅㄛㄧㄡ
- X: 誒克斯、ㄎㄜ
- Y: 外、歪、ㄨㄞ
- Z: 誒、ㄗ

數字常見念法：
- 0: 洞、零、〇
- 1: 么、腰、一、壹
- 2: 兩、二、貳、兩
- 3: 三、參
- 4: 四、肆
- 5: 五、伍
- 6: 六、陸
- 7: 七、柒、拐
- 8: 八、捌
- 9: 九、狗、勾、玖

## 輸出格式（JSON）
{
  "plates": [
    { "plate": "ABC-1234", "confidence": 0.9 },
    { "plate": "ABC-1235", "confidence": 0.6 }
  ]
}

- 最多返回 3 個候選
- confidence 範圍 0-1
- 如果完全無法識別，返回空陣列

語音內容：
"""
${transcript}
"""
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 200,
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      return this.normalizePlates(parsed.plates || []);
    } catch (error) {
      this.logger.error(`Failed to parse plate: ${error.message}`);
      return [];
    }
  }

  private buildPrompt(transcript: string): string {
    return `
你是台灣車牌辨識助手。分析以下語音轉文字內容，提取關鍵資訊。

## 台灣車牌格式規則
汽車車牌：
- 新式：3字母-4數字（如 ABC-1234）
- 舊式：2字母-4數字（如 AB-1234）
- 更舊：4數字-2字母（如 1234-AB）

機車車牌：
- 普通：3字母-3數字（如 ABC-123）
- 普通：3數字-3字母（如 123-ABC）
- 重機：2字母-4數字

## 口語轉換規則（重要）

### 字母常見念法
| 字母 | 常見念法 |
|------|----------|
| A | 阿、啊、誒A |
| B | 逼、比、ㄅㄧ |
| C | 西、ㄒㄧ |
| D | 滴、低、ㄉㄧ |
| E | 伊、誒 |
| F | 誒福、ㄈㄨ |
| G | 雞、乩、ㄐㄧ |
| H | 誒曲、ㄏㄟ |
| J | 乩誒、ㄐㄟ |
| K | ㄎㄟ、K |
| L | 誒偶、ㄌㄟ |
| M | 誒母、ㄇㄨ |
| N | 誒恩、ㄣ |
| P | 批、ㄆㄧ |
| Q | 乞、ㄑㄧㄡ |
| R | 阿、ㄚ |
| S | 誒死、ㄙ |
| T | 踢、ㄊㄧ |
| U | 優、ㄧㄡ |
| V | 威、ㄨㄟ |
| W | 搭波優 |
| X | 誒克斯 |
| Y | 外、歪、ㄨㄞ |
| Z | 誒、ㄗ |

### 數字常見念法
| 數字 | 常見念法 |
|------|----------|
| 0 | 洞、零、〇 |
| 1 | 么、腰、一、壹 |
| 2 | 兩、二、貳 |
| 3 | 三、參 |
| 4 | 四、肆 |
| 5 | 五、伍 |
| 6 | 六、陸 |
| 7 | 七、柒、拐 |
| 8 | 八、捌 |
| 9 | 九、狗、勾、玖 |

## 事件分類對應
- VEHICLE_REMINDER（車況提醒）：車燈沒開、輪胎沒氣、車門沒關、物品掉落等
- SAFETY_REMINDER（行車安全）：危險駕駛、逼車、亂切車道、闖紅燈、超速等
- PRAISE（讚美感謝）：禮讓、幫助、好心提醒等
- OTHER（其他）：無法分類的情況

## 輸出格式（必須是有效 JSON）
{
  "plates": [
    { "plate": "ABC-1234", "confidence": 0.9 },
    { "plate": "ABC-1235", "confidence": 0.7 }
  ],
  "vehicle": {
    "type": "car",
    "color": "白色",
    "brand": "Toyota",
    "model": "Camry"
  },
  "event": {
    "category": "SAFETY_REMINDER",
    "type": "dangerous_lane_change",
    "description": "危險切換車道",
    "location": "中山路口",
    "sentiment": "negative"
  },
  "suggestedMessage": "您好，剛才在中山路口的切換車道方式較為突然，後方車輛需要緊急煞車。行車時請多留意周遭車輛，保持安全距離。祝行車平安！"
}

## 注意事項
1. plates 最多 3 個候選，按信心度排序
2. 如果無法識別車牌，plates 返回空陣列 []
3. vehicle.type 只能是 "car"、"scooter" 或 "unknown"
4. suggestedMessage 要：
   - 禮貌、客觀、不帶攻擊性
   - 15-50 字
   - 不要使用「您的車」這種說法（因為不確定是不是車主本人）
   - 正面事件要表達感謝
5. 如果語音內容是髒話或攻擊性語言，suggestedMessage 要轉化為溫和版本

語音內容：
"""
${transcript}
"""
`;
  }

  private normalizeResponse(raw: any): ParsedVoiceContent {
    return {
      plates: this.normalizePlates(raw.plates || []),
      vehicle: {
        type: raw.vehicle?.type || 'unknown',
        color: raw.vehicle?.color,
        brand: raw.vehicle?.brand,
        model: raw.vehicle?.model,
      },
      event: {
        category: this.normalizeCategory(raw.event?.category),
        type: raw.event?.type || 'unknown',
        description: raw.event?.description || '',
        location: raw.event?.location,
        sentiment: raw.event?.sentiment || 'neutral',
      },
      suggestedMessage: raw.suggestedMessage || '',
    };
  }

  private normalizePlates(plates: any[]): ParsedPlate[] {
    if (!Array.isArray(plates)) return [];

    return plates
      .filter((p) => p && typeof p.plate === 'string')
      .map((p) => ({
        plate: this.formatPlate(p.plate),
        confidence: typeof p.confidence === 'number' ? p.confidence : 0.5,
      }))
      .filter((p) => this.isValidPlateFormat(p.plate))
      .slice(0, 3);
  }

  private formatPlate(plate: string): string {
    // 移除所有空格和連字號
    const clean = plate.replace(/[\s-]/g, '').toUpperCase();

    // 嘗試匹配各種車牌格式並加入連字號
    // 汽車：AAA-0000
    if (/^[A-Z]{3}\d{4}$/.test(clean)) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }
    // 汽車：AA-0000
    if (/^[A-Z]{2}\d{4}$/.test(clean)) {
      return `${clean.slice(0, 2)}-${clean.slice(2)}`;
    }
    // 汽車：0000-AA
    if (/^\d{4}[A-Z]{2}$/.test(clean)) {
      return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    }
    // 機車：AAA-000
    if (/^[A-Z]{3}\d{3}$/.test(clean)) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }
    // 機車：000-AAA
    if (/^\d{3}[A-Z]{3}$/.test(clean)) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    }

    // 如果都不匹配，返回原本的（可能不是有效車牌）
    return plate.toUpperCase();
  }

  private isValidPlateFormat(plate: string): boolean {
    const patterns = [
      /^[A-Z]{3}-\d{4}$/, // AAA-0000 汽車
      /^[A-Z]{2}-\d{4}$/, // AA-0000 汽車
      /^\d{4}-[A-Z]{2}$/, // 0000-AA 汽車
      /^[A-Z]{3}-\d{3}$/, // AAA-000 機車
      /^\d{3}-[A-Z]{3}$/, // 000-AAA 機車
    ];

    return patterns.some((p) => p.test(plate));
  }

  private normalizeCategory(
    category: string,
  ): 'VEHICLE_REMINDER' | 'SAFETY_REMINDER' | 'PRAISE' | 'OTHER' {
    const normalized = category?.toUpperCase();
    if (
      ['VEHICLE_REMINDER', 'SAFETY_REMINDER', 'PRAISE', 'OTHER'].includes(
        normalized,
      )
    ) {
      return normalized as any;
    }
    return 'OTHER';
  }
}
