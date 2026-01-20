# 路上提醒平台 (BBBeeep)

一個讓駕駛者可以私密發送善意提醒的系統，不是聊天平台而是一次性提醒服務。

## 專案結構

```
BBBeeep/
├── frontend/          # Next.js + TypeScript (Frontend/BFF)
├── backend/           # NestJS + TypeScript (Core API)
└── README.md
```

## 技術棧

### Frontend/BFF
- **框架**: Next.js 14+ (App Router)
- **語言**: TypeScript
- **UI**: Tailwind CSS + Radix UI
- **狀態管理**: React Context / Zustand

### Backend
- **框架**: NestJS
- **語言**: TypeScript
- **資料庫**: PostgreSQL
- **快取**: Redis (Railway/Upstash/Redis Cloud)
- **AI**: OpenAI / Google AI (for rewrite endpoint)

## 快速開始

### 前置需求
- Node.js 18+
- PostgreSQL 14+
- Redis (可選，用於快取)

### 安裝依賴

```bash
npm run install:all
```

**✅ 安裝完成！** 如果遇到問題，請查看：
- `INSTALLATION_SUCCESS.md` - 安裝成功指南
- `INSTALLATION_FIX.md` - 問題修復說明

### 環境變數設定

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bbbeeep

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# AI Service (選擇一個)
OPENAI_API_KEY=your-openai-key
# 或
GOOGLE_AI_API_KEY=your-google-ai-key

# Server
PORT=3001
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 啟動開發伺服器

```bash
# 同時啟動前端和後端
npm run dev

# 或分別啟動
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:3001
```

### 資料庫遷移

```bash
cd backend
npm run migration:run
```

## 核心功能

### 後端 ✅
- ✅ 用戶註冊與登入（手機號碼驗證）
- ✅ Onboarding API（用戶類型選擇、車牌設定）
- ✅ 發送提醒 API（車況、行車安全、讚美）
- ✅ 收件箱 API（查看收到的提醒）
- ✅ 點數系統 API（儲值、消耗、歷史記錄）
- ✅ AI 改寫功能 API（每日5次限制）
- ✅ 封鎖/拒收功能 API
- ✅ Swagger API 文檔

### 前端 ✅
- ✅ Landing Page（落地頁）
- ✅ Login Page（登入頁）
- ✅ Onboarding Page（註冊流程）
- ✅ Home Page（首頁）
- ✅ Send Page（發送提醒）- 完整流程，含AI改寫
- ✅ Inbox Page（收件箱）- 含封鎖/拒收功能
- ✅ Sent Page（已發送訊息）- 完整實現
- ✅ Wallet Page（錢包）- 完整實現，含儲值、點數歷史
- ✅ Settings Page（設置）- 完整實現，含用戶信息編輯
- ✅ Block List Page（封鎖列表）- 完整實現
- ✅ Notification Settings Page（通知設置）- 完整實現
- ✅ 底部導航欄

## 設計系統

使用 **Modern Calm Blue** 設計系統：
- 主色：`#4A6FA5`
- 深藍CTA：`#3C5E8C`
- 淡藍選中狀態：`#EAF0F8`

詳細設計規範請參考 `/Users/dannykan/Downloads/Landing Page Design/MODERN_CALM_BLUE_GUIDE.md`

## API 文檔

API 文檔將在後端啟動後可於 `http://localhost:3001/api` 查看（如果啟用 Swagger）。

## 項目狀態

### ✅ 已完成（核心功能 90%）
- ✅ 後端完整 API 實現
- ✅ 前端核心頁面（Landing, Login, Onboarding, Home, Send, Inbox）
- ✅ 完整的用戶流程（註冊 → 發送提醒 → 接收提醒）
- ✅ AI 改寫功能集成
- ✅ 封鎖/拒收功能
- ✅ 狀態管理和 API 集成
- ✅ Docker 配置
- ✅ CI/CD 配置

### ⏳ 待實現（擴展功能）
- ⏳ 儲值支付功能整合（目前顯示「尚未開通」）
- ⏳ 刪除帳號功能（後端 API 待實現）
- ⏳ 其他功能優化（參考 `NEXT_STEPS.md`）

## 文檔

- `SETUP.md` - 詳細設置指南
- `QUESTIONS.md` - 問題確認
- `EXPLANATIONS.md` - 技術說明
- `FIREBASE_SMS_SETUP.md` - Firebase SMS 設置
- `PROGRESS.md` - 進度報告
- `NEXT_STEPS.md` - 下一步工作指南
- `IMPLEMENTATION_NOTES.md` - 實現說明

## 授權

Private
