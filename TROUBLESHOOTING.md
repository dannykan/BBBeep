# 故障排除指南

## 常見問題

### 1. API 返回 400 Bad Request

#### 問題：POST /messages 返回 400

**可能原因：**
- DTO 驗證失敗
- 類型轉換問題
- 缺少必填字段

**解決方案：**
1. 檢查後端終端的錯誤日誌
2. 確認請求數據格式正確
3. 確認 `type` 字段為：`'車況提醒'`、`'行車安全提醒'` 或 `'讚美感謝'`

**已修復**：查看 `API_FIX.md`

---

### 2. 數據庫連接失敗

#### 問題：無法連接到 PostgreSQL

**可能原因：**
- 數據庫容器未運行
- 端口配置錯誤
- 環境變數不正確

**解決方案：**
```bash
# 檢查容器狀態
docker ps | grep postgres

# 檢查端口
# Docker 使用 5433，本地 PostgreSQL 使用 5432

# 確認環境變數
cat backend/.env | grep DATABASE_URL
```

---

### 3. Prisma 遷移問題

#### 問題：遷移失敗或找不到表

**解決方案：**
```bash
cd backend

# 重新生成 Prisma Client
npm run prisma:generate

# 重置數據庫（開發環境）
npx prisma migrate reset

# 或創建新遷移
npm run prisma:migrate
```

---

### 4. 端口被占用

#### 問題：端口 5432、3001、3000 被占用

**解決方案：**

**PostgreSQL (5432)**：
- 已配置為使用 5433（Docker）
- 或停止占用端口的服務

**後端 (3001)**：
- 修改 `backend/.env` 中的 `PORT`

**前端 (3000)**：
- Next.js 會自動使用下一個可用端口

---

### 5. 驗證碼問題

#### 問題：無法獲取驗證碼

**開發環境：**
- 驗證碼會顯示在**後端終端**中
- 格式：`[DEV] Verification code for 0912345678: 123456`

**生產環境：**
- 需要配置 Firebase SMS（參考 `FIREBASE_SMS_SETUP.md`）

---

### 6. CORS 錯誤

#### 問題：前端無法訪問後端 API

**解決方案：**
1. 確認 `backend/.env` 中的 `FRONTEND_URL` 正確
2. 確認 `frontend/.env.local` 中的 `NEXT_PUBLIC_API_URL` 正確
3. 重啟後端服務器

---

### 7. 類型錯誤

#### 問題：TypeScript 編譯錯誤

**解決方案：**
```bash
# 後端
cd backend
npm run build

# 前端
cd frontend
npm run build
```

---

## 🔍 調試技巧

### 查看後端日誌
後端終端會顯示：
- API 請求日誌
- 驗證錯誤詳情
- 數據庫查詢（如果啟用）

### 查看前端日誌
瀏覽器開發者工具：
- Console：JavaScript 錯誤
- Network：API 請求和響應

### 使用 Swagger 測試
訪問 http://localhost:3001/api
- 可以直接測試 API
- 查看請求/響應格式
- 測試認證

---

## 📞 獲取幫助

1. 查看相關文檔：
   - `DEBUG_API.md` - API 調試指南
   - `API_FIX.md` - API 錯誤修復
   - `SETUP.md` - 設置指南

2. 檢查日誌：
   - 後端終端輸出
   - 瀏覽器控制台
   - Docker 容器日誌：`docker logs bbbeeep-postgres`

3. 驗證配置：
   - 環境變數是否正確
   - 數據庫是否運行
   - 端口是否可用
