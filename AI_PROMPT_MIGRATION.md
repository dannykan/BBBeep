# AI Prompt 功能迁移说明

## 数据库迁移

新功能需要添加 `AIPrompt` 表到数据库。请按照以下步骤操作：

### 本地开发环境

```bash
cd backend
npx prisma migrate dev --name add_ai_prompt_table
```

### 生产环境 (Railway)

由于 Railway 的权限限制，建议使用以下方法之一：

#### 方法 1：使用 Railway CLI（推荐）

```bash
# 1. 安装 Railway CLI（如果还没有）
npm i -g @railway/cli

# 2. 登录 Railway
railway login

# 3. 连接到项目
cd backend
railway link

# 4. 运行迁移
railway run npx prisma migrate deploy
```

#### 方法 2：使用 SQL 脚本

如果 Railway CLI 不可用，可以使用 SQL 脚本直接创建表：

```sql
-- 创建 AIPrompt 表
CREATE TABLE IF NOT EXISTS "AIPrompt" (
    "id" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "category" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPrompt_pkey" PRIMARY KEY ("id")
);

-- 创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS "AIPrompt_vehicleType_category_key" ON "AIPrompt"("vehicleType", "category");

-- 创建索引
CREATE INDEX IF NOT EXISTS "AIPrompt_vehicleType_category_isActive_idx" ON "AIPrompt"("vehicleType", "category", "isActive");
```

在 Railway PostgreSQL 的 Query 编辑器中执行上述 SQL。

#### 方法 3：初始化默认 Prompts

迁移完成后，可以在 Admin 页面手动创建 prompts，或者使用以下 SQL 插入默认值：

```sql
-- 插入默认 prompts（汽车）
INSERT INTO "AIPrompt" ("id", "vehicleType", "category", "prompt", "isActive", "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid()::text, 'car', '車況提醒', '請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n{text}', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'car', '行車安全', '請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n{text}', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'car', '讚美感謝', '請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n{text}', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'car', '其他情況', '請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n{text}', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'scooter', '車況提醒', '請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n{text}', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'scooter', '行車安全', '請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n{text}', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'scooter', '讚美感謝', '請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n{text}', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'scooter', '其他情況', '請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n{text}', true, NOW(), NOW())
ON CONFLICT ("vehicleType", "category") DO NOTHING;
```

## 功能说明

### Admin 页面使用

1. 登录 Admin 页面：`/BBBeepadmin2026`
2. 点击 "AI Prompt 管理" 按钮
3. 编辑每个车辆类型和分类的 prompt
4. 使用 `{text}` 作为用户输入文字的占位符
5. 点击 "儲存" 按钮保存更改

### Prompt 格式

- 必须包含 `{text}` 占位符，会被实际文字替换
- 可以自定义 system message 和 user message 的格式
- 如果没有配置 prompt，会使用默认值

### 支持的组合

- 汽车 × 車況提醒
- 汽车 × 行車安全
- 汽车 × 讚美感謝
- 汽车 × 其他情況
- 机車 × 車況提醒
- 机車 × 行車安全
- 机車 × 讚美感謝
- 机車 × 其他情況

## 注意事项

1. **迁移顺序**：先运行数据库迁移，再部署代码
2. **默认值**：如果没有找到对应的 prompt，系统会使用默认 prompt
3. **实时生效**：更新 prompt 后立即生效，无需重启服务
4. **占位符**：确保 prompt 中包含 `{text}` 占位符
