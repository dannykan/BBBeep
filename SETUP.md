# 項目設置指南

## 快速開始

### 1. 安裝依賴

```bash
# 安裝根目錄依賴
npm install

# 安裝所有子項目依賴
npm run install:all
```

### 2. 設置資料庫

#### 創建 PostgreSQL 資料庫

```bash
# 使用 psql 或任何 PostgreSQL 客戶端
createdb bbbeeep
```

#### 配置環境變數

在 `backend/` 目錄下創建 `.env` 文件：

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bbbeeep

# Redis (可選)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# AI Service (選擇一個)
OPENAI_API_KEY=your-openai-api-key
# 或
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### 運行資料庫遷移

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### 3. 設置前端環境變數

在 `frontend/` 目錄下創建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. 啟動開發伺服器

```bash
# 從根目錄同時啟動前端和後端
npm run dev

# 或分別啟動
npm run dev:backend   # http://localhost:3001
npm run dev:frontend  # http://localhost:3000
```

## 項目結構

```
BBBeeep/
├── backend/              # NestJS 後端 API
│   ├── src/
│   │   ├── auth/        # 認證模組
│   │   ├── users/       # 用戶模組
│   │   ├── messages/    # 消息模組
│   │   ├── points/      # 點數模組
│   │   ├── ai/          # AI 改寫模組
│   │   └── common/      # 共用模組（Prisma, Redis）
│   └── prisma/          # Prisma schema
├── frontend/            # Next.js 前端
│   └── src/
│       ├── app/         # Next.js App Router 頁面
│       ├── components/  # React 組件
│       ├── lib/         # 工具函數和 API 客戶端
│       └── types/       # TypeScript 類型定義
└── README.md
```

## API 文檔

啟動後端後，訪問 Swagger API 文檔：
- http://localhost:3001/api

## 開發注意事項

### 後端

1. **認證**: 使用 JWT，token 存儲在 localStorage
2. **驗證碼**: 開發環境會在控制台輸出驗證碼
3. **AI 服務**: 優先使用 OpenAI，如果未配置則使用 Google AI
4. **Redis**: 可選，如果未配置會跳過快取功能

### 前端

1. **路由**: 使用 Next.js App Router
2. **樣式**: 使用 Tailwind CSS，遵循 Modern Calm Blue 設計系統
3. **狀態管理**: 可以使用 Context API 或 Zustand（待實現）
4. **API 調用**: 使用 axios，自動處理 token 和錯誤

## 下一步

請查看 `QUESTIONS.md` 了解需要確認的問題，然後我可以繼續完成：
- 前端頁面組件實現
- UI 組件庫
- 狀態管理
- 測試和調試
