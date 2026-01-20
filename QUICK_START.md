# 快速開始指南

## ✅ 步驟 1：安裝完成

所有依賴已成功安裝！

## 📋 步驟 2：設置數據庫

### 選項 A：使用 Docker Compose（推薦）

```bash
# 從項目根目錄啟動 PostgreSQL 和 Redis
docker-compose up -d postgres redis

# 等待幾秒讓數據庫啟動
sleep 5
```

### 選項 B：使用本地 PostgreSQL

確保您已經安裝並運行 PostgreSQL，然後創建數據庫：

```bash
createdb bbbeeep
```

## ⚙️ 步驟 3：配置環境變數

### 後端環境變數

創建 `backend/.env` 文件：

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bbbeeep

# Redis (可選)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# AI Service
OPENAI_API_KEY=your-openai-api-key

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 前端環境變數

創建 `frontend/.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🗄️ 步驟 4：運行數據庫遷移

```bash
cd backend
npm run prisma:migrate
```

這會：
- 創建數據庫表
- 生成 Prisma Client

## 🚀 步驟 5：啟動開發服務器

### 方式 1：同時啟動前後端（推薦）

```bash
# 從項目根目錄
npm run dev
```

### 方式 2：分別啟動

```bash
# 終端 1：啟動後端
cd backend
npm run start:dev

# 終端 2：啟動前端
cd frontend
npm run dev
```

## 🌐 訪問應用

- **前端**: http://localhost:3000
- **後端 API**: http://localhost:3001
- **API 文檔**: http://localhost:3001/api (Swagger)

## 🧪 測試流程

1. **訪問前端**: http://localhost:3000
2. **點擊「立即註冊」**
3. **輸入手機號碼**: 0912345678（開發環境會顯示驗證碼在控制台）
4. **輸入驗證碼**: 查看後端控制台獲取驗證碼
5. **完成註冊流程**
6. **開始使用！**

## ⚠️ 常見問題

### 問題 1：數據庫連接失敗

**解決方案**：
- 確認 PostgreSQL 正在運行
- 檢查 `DATABASE_URL` 是否正確
- 確認數據庫 `bbbeeep` 已創建

### 問題 2：Prisma 錯誤

**解決方案**：
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### 問題 3：端口被占用

**解決方案**：
- 後端：修改 `backend/.env` 中的 `PORT`
- 前端：修改 `frontend/.env.local` 中的 `NEXT_PUBLIC_API_URL`

### 問題 4：依賴安裝警告

**說明**：這些警告是正常的，不影響功能。可以忽略。

## 📚 下一步

- 查看 `SETUP.md` 獲取詳細設置指南
- 查看 `README.md` 了解項目結構
- 查看 `NEXT_STEPS.md` 了解待實現功能

## 🎉 準備就緒！

現在您可以開始開發和測試了！
