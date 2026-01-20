# AI Prompt 管理方案

## 当前状态

目前 AI prompt 是硬编码在 `backend/src/ai/ai.service.ts` 中：

- **OpenAI**: System message 和 user message 都是固定的
- **Google AI**: Prompt 模板是固定的字符串

```typescript
// OpenAI (第108-114行)
system: '你是一個友善的助手，專門將用戶的文字改寫為更溫和、禮貌的語氣。請保持原意，但使用更溫和的表達方式。只返回改寫後的文字，不要添加任何解釋。'
user: `請將以下文字改寫為更溫和的語氣：${text}`

// Google AI (第130行)
const prompt = `請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n${text}`;
```

## 需求

1. **支持不同情境的 Prompt**：
   - 汽車 - 車況提醒
   - 汽車 - 行車安全
   - 汽車 - 讚美感謝
   - 機車 - 車況提醒
   - 機車 - 行車安全
   - 機車 - 讚美感謝
   - 其他情況

2. **在 Admin 页面管理 Prompt**：
   - 可以编辑每个情境的 prompt
   - 不需要重新部署即可更新
   - 支持实时生效

## 实现方案

### 1. 数据库设计

在 `schema.prisma` 中添加新表：

```prisma
model AIPrompt {
  id          String   @id @default(cuid())
  vehicleType VehicleType  // car | scooter
  category    String       // '車況提醒' | '行車安全' | '讚美感謝' | '其他情況'
  prompt      String       // Prompt 模板，可以使用 {text} 占位符
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([vehicleType, category])
  @@index([vehicleType, category, isActive])
}
```

### 2. 后端实现

#### 2.1 创建 Migration

```bash
cd backend
npx prisma migrate dev --name add_ai_prompt_table
```

#### 2.2 创建 AIPrompt Service

`backend/src/ai/ai-prompt.service.ts`:

```typescript
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
      orderBy: [
        { vehicleType: 'asc' },
        { category: 'asc' },
      ],
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
```

#### 2.3 更新 AI Service

修改 `backend/src/ai/ai.service.ts`:

```typescript
import { AIPromptService } from './ai-prompt.service';

export class AiService {
  constructor(
    // ... existing
    private aiPromptService: AIPromptService,
  ) {}

  async rewrite(
    userId: string, 
    text: string, 
    vehicleType?: VehicleType, 
    category?: string
  ): Promise<string> {
    // ... existing validation code ...

    let rewrittenText: string;
    let promptTemplate: string;

    // 获取对应的 prompt
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
      }
      // ... rest of the code
    }
  }

  private async rewriteWithOpenAI(text: string, promptTemplate: string): Promise<string> {
    // 解析 prompt 模板
    const systemPrompt = promptTemplate.split('{text}')[0] || 
      '你是一個友善的助手，專門將用戶的文字改寫為更溫和、禮貌的語氣。';
    const userPrompt = promptTemplate.replace('{text}', text);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content?.trim() || text;
  }

  private async rewriteWithGoogleAI(text: string, promptTemplate: string): Promise<string> {
    const prompt = promptTemplate.replace('{text}', text);
    const model = this.googleAi.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  }
}
```

#### 2.4 更新 AI Controller

修改 `backend/src/ai/ai.controller.ts` 和 DTO，传递 vehicleType 和 category：

```typescript
// dto/rewrite.dto.ts
export class RewriteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  text: string;

  @IsOptional()
  @IsIn(['car', 'scooter'])
  vehicleType?: 'car' | 'scooter';

  @IsOptional()
  @IsString()
  category?: string;
}

// ai.controller.ts
@Post('rewrite')
async rewrite(
  @CurrentUser() user: any, 
  @Body() dto: RewriteDto
) {
  const rewritten = await this.aiService.rewrite(
    user.userId, 
    dto.text,
    dto.vehicleType,
    dto.category
  );
  return { rewritten };
}
```

#### 2.5 创建 Admin API

`backend/src/admin/admin.controller.ts` 添加：

```typescript
@Get('ai-prompts')
@ApiOperation({ summary: '獲取所有 AI Prompt' })
async getAIPrompts() {
  return this.aiPromptService.getAllPrompts();
}

@Put('ai-prompts')
@ApiOperation({ summary: '更新 AI Prompt' })
async updateAIPrompt(
  @Body() dto: { vehicleType: VehicleType; category: string; prompt: string }
) {
  return this.aiPromptService.updatePrompt(
    dto.vehicleType,
    dto.category,
    dto.prompt
  );
}
```

### 3. 前端实现

#### 3.1 更新 API Service

`frontend/src/lib/api-services.ts`:

```typescript
// 在 rewrite 调用时传递 vehicleType 和 category
export const aiApi = {
  // ... existing
  rewrite: (text: string, vehicleType?: 'car' | 'scooter', category?: string) =>
    api.post<{ rewritten: string }>('/ai/rewrite', { text, vehicleType, category })
      .then((res) => res.data),
};
```

#### 3.2 更新 Send Page

在 `frontend/src/app/send/page.tsx` 的 `handleAddCustomText` 中：

```typescript
const result = await aiApi.rewrite(textToRewrite, vehicleType, selectedCategory);
```

#### 3.3 创建 Admin Prompt 管理页面

`frontend/src/app/BBBeepadmin2026/ai-prompts/page.tsx`:

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Car, Bike, Save } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AIPrompt {
  id: string;
  vehicleType: 'car' | 'scooter';
  category: string;
  prompt: string;
  isActive: boolean;
}

const categories = ['車況提醒', '行車安全', '讚美感謝', '其他情況'];
const vehicleTypes = [
  { value: 'car', label: '汽車', icon: Car },
  { value: 'scooter', label: '機車', icon: Bike },
];

export default function AIPromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/BBBeepadmin2026');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/admin/ai-prompts`, {
        headers: { 'x-admin-token': token },
      });
      setPrompts(response.data);
      
      // 初始化编辑状态
      const editState: Record<string, string> = {};
      response.data.forEach((p: AIPrompt) => {
        editState[`${p.vehicleType}-${p.category}`] = p.prompt;
      });
      setEditing(editState);
    } catch (error: any) {
      toast.error('載入 Prompt 失敗');
    }
  };

  const handleSave = async (vehicleType: 'car' | 'scooter', category: string) => {
    const token = localStorage.getItem('admin_token');
    const key = `${vehicleType}-${category}`;
    const prompt = editing[key];

    if (!prompt || !prompt.trim()) {
      toast.error('Prompt 不能為空');
      return;
    }

    setIsLoading(true);
    try {
      await axios.put(
        `${API_URL}/admin/ai-prompts`,
        { vehicleType, category, prompt },
        { headers: { 'x-admin-token': token } }
      );
      toast.success('更新成功');
      loadPrompts();
    } catch (error: any) {
      toast.error('更新失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const getPrompt = (vehicleType: 'car' | 'scooter', category: string): string => {
    const key = `${vehicleType}-${category}`;
    return editing[key] || '';
  };

  const setPrompt = (vehicleType: 'car' | 'scooter', category: string, value: string) => {
    const key = `${vehicleType}-${category}`;
    setEditing({ ...editing, [key]: value });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-foreground">AI Prompt 管理</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {vehicleTypes.map((vt) => (
          <Card key={vt.value} className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <vt.icon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{vt.label}</h2>
            </div>

            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category} className="space-y-2">
                  <Label>{category}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={getPrompt(vt.value as 'car' | 'scooter', category)}
                      onChange={(e) =>
                        setPrompt(vt.value as 'car' | 'scooter', category, e.target.value)
                      }
                      placeholder="請輸入 Prompt（可使用 {text} 作為文字占位符）"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleSave(vt.value as 'car' | 'scooter', category)}
                      disabled={isLoading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      儲存
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### 3.4 在 Admin 主页面添加链接

在 `frontend/src/app/BBBeepadmin2026/page.tsx` 的导航按钮中添加：

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => router.push('/BBBeepadmin2026/ai-prompts')}
>
  AI Prompt 管理
</Button>
```

## 实施步骤

1. **创建数据库迁移**
   ```bash
   cd backend
   npx prisma migrate dev --name add_ai_prompt_table
   ```

2. **创建初始数据（Seed）**
   在 `backend/prisma/seed.ts` 中添加默认 prompts

3. **实现后端服务**
   - 创建 `AIPromptService`
   - 更新 `AiService` 使用动态 prompt
   - 创建 Admin API endpoints

4. **实现前端页面**
   - 创建 Admin Prompt 管理页面
   - 更新 API service 传递 vehicleType 和 category
   - 更新 Send page 传递参数

5. **测试**
   - 测试不同情境的 prompt 是否正确应用
   - 测试 Admin 页面可以编辑和保存
   - 测试更新后立即生效

## 注意事项

1. **Prompt 模板格式**：使用 `{text}` 作为占位符，会被实际文字替换
2. **默认值**：如果没有找到对应的 prompt，使用默认值
3. **缓存**：可以考虑添加 Redis 缓存以提高性能
4. **验证**：在保存时验证 prompt 格式，确保包含 `{text}` 占位符
