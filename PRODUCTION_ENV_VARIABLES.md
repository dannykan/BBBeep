# BBBeep Production 環境變數設定指南

## 概覽

本文件列出部署 BBBeep 到 Production 環境所需的所有環境變數。

---

## 1. Railway - Backend 服務

在 Railway 的 Backend 服務中設定以下變數：

### 資料庫 (PostgreSQL)
```env
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:PORT/DATABASE_NAME
```
> ⚠️ Railway 會自動提供此變數，連接到同專案的 PostgreSQL 服務

### Redis
```env
REDIS_URL=redis://default:PASSWORD@HOST:PORT
```
> ⚠️ Railway 會自動提供此變數，連接到同專案的 Redis 服務

### JWT 認證
```env
JWT_SECRET=your-super-secure-random-string-at-least-32-characters
JWT_EXPIRES_IN=30d
```
> ⚠️ **重要**：JWT_SECRET 必須是固定的隨機字串，否則每次部署會讓所有用戶登出
>
> 產生安全的 secret：`openssl rand -base64 32`

### AI 服務 (擇一設定)

**OpenAI：**
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**或 Google AI：**
```env
GOOGLE_AI_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 伺服器設定
```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

### LINE Login
```env
LINE_CHANNEL_ID=2008933864
LINE_CHANNEL_SECRET=138b07456bbd2178b99a6dbbd84061e8
LINE_CALLBACK_URL=https://your-frontend-domain.com/auth/line/callback
```

### 開發用（Production 不需要）
```env
# 只在開發環境使用，讓驗證碼直接回傳
RETURN_VERIFY_CODE=true
```
> ⚠️ **Production 絕對不要設定此變數**

---

## 2. Railway - PostgreSQL 服務

Railway 會自動建立並管理，通常不需要手動設定。

若需要手動連接，變數格式如下：
```env
PGHOST=xxx.railway.app
PGPORT=5432
PGUSER=postgres
PGPASSWORD=xxxxxxxx
PGDATABASE=railway
```

---

## 3. Railway - Redis 服務

Railway 會自動建立並管理，通常不需要手動設定。

若需要手動連接，變數格式如下：
```env
REDIS_URL=redis://default:PASSWORD@HOST:PORT
```

---

## 4. Cloudflare Pages - Frontend

在 Cloudflare Pages 的專案設定中，加入以下環境變數：

### API 連線
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.railway.app
```

### LINE Login
```env
NEXT_PUBLIC_LINE_CHANNEL_ID=2008933864
NEXT_PUBLIC_LINE_CALLBACK_URL=https://your-frontend-domain.com/auth/line/callback
```

### 登入方式
```env
NEXT_PUBLIC_LOGIN_METHODS=line
```
> 可選值：`line`, `phone`, `line,phone`

### Google Maps API
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 5. LINE Developers Console

網址：https://developers.line.biz/console/

### LINE Login Channel 設定

1. **Callback URL**
   ```
   https://your-frontend-domain.com/auth/line/callback
   ```

2. **Channel ID** - 複製到：
   - Backend: `LINE_CHANNEL_ID`
   - Frontend: `NEXT_PUBLIC_LINE_CHANNEL_ID`

3. **Channel Secret** - 複製到：
   - Backend: `LINE_CHANNEL_SECRET`

---

## 6. Google Cloud Console

網址：https://console.cloud.google.com/

### 啟用的 API
- ✅ Geocoding API
- ✅ Maps JavaScript API

### API Key 限制設定
1. **應用程式限制**：HTTP 參照網址
2. **網站限制**：
   ```
   https://your-frontend-domain.com/*
   ```
3. **API 限制**：僅限 Geocoding API、Maps JavaScript API

### 環境變數
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 7. OpenAI / Google AI

### OpenAI
網址：https://platform.openai.com/api-keys

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Google AI (替代方案)
網址：https://aistudio.google.com/app/apikey

```env
GOOGLE_AI_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 快速檢查清單

### Railway Backend
- [ ] `DATABASE_URL` - PostgreSQL 連線（自動）
- [ ] `REDIS_URL` - Redis 連線（自動）
- [ ] `JWT_SECRET` - **必填，固定值**
- [ ] `JWT_EXPIRES_IN` - 建議 `30d`
- [ ] `OPENAI_API_KEY` 或 `GOOGLE_AI_API_KEY` - AI 服務
- [ ] `PORT` - `3001`
- [ ] `NODE_ENV` - `production`
- [ ] `FRONTEND_URL` - 前端網址
- [ ] `LINE_CHANNEL_ID` - LINE Channel ID
- [ ] `LINE_CHANNEL_SECRET` - LINE Channel Secret
- [ ] `LINE_CALLBACK_URL` - LINE 回調網址

### Cloudflare Frontend
- [ ] `NEXT_PUBLIC_API_URL` - 後端 API 網址
- [ ] `NEXT_PUBLIC_LINE_CHANNEL_ID` - LINE Channel ID
- [ ] `NEXT_PUBLIC_LINE_CALLBACK_URL` - LINE 回調網址
- [ ] `NEXT_PUBLIC_LOGIN_METHODS` - `line`
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API Key

### 第三方服務
- [ ] LINE Developers - Callback URL 設定
- [ ] Google Cloud - API 啟用與限制
- [ ] OpenAI / Google AI - API Key

---

## 範例：完整的 Backend .env.production

```env
# Database (Railway 自動提供)
DATABASE_URL=postgresql://postgres:xxx@xxx.railway.app:5432/railway

# Redis (Railway 自動提供)
REDIS_URL=redis://default:xxx@xxx.railway.app:6379

# JWT - 重要！必須是固定的隨機字串
JWT_SECRET=K7xJ9mP2nQ5sT8vY1zA4bC6dE3fG0hI2
JWT_EXPIRES_IN=30d

# AI Service
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://bbbeep.com

# LINE Login
LINE_CHANNEL_ID=2008933864
LINE_CHANNEL_SECRET=138b07456bbd2178b99a6dbbd84061e8
LINE_CALLBACK_URL=https://bbbeep.com/auth/line/callback
```

## 範例：完整的 Frontend 環境變數

```env
NEXT_PUBLIC_API_URL=https://api.bbbeep.com
NEXT_PUBLIC_LINE_CHANNEL_ID=2008933864
NEXT_PUBLIC_LINE_CALLBACK_URL=https://bbbeep.com/auth/line/callback
NEXT_PUBLIC_LOGIN_METHODS=line
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBteVysd7aJvM7vJHFdpH_bePP7jmlY-_c
```

---

## 常見問題

### Q: 為什麼用戶每次都要重新登入？
A: 檢查 `JWT_SECRET` 是否在每次部署時保持一致。如果 secret 改變，所有舊 token 都會失效。

### Q: LINE 登入失敗？
A: 確認 LINE Developers Console 的 Callback URL 與 `LINE_CALLBACK_URL` / `NEXT_PUBLIC_LINE_CALLBACK_URL` 完全一致。

### Q: Google 地圖不顯示？
A: 確認 Google Cloud Console 中已啟用 Maps JavaScript API，並且 API Key 的網站限制包含你的網域。

### Q: AI 功能無法使用？
A: 確認 `OPENAI_API_KEY` 或 `GOOGLE_AI_API_KEY` 已正確設定，且 API 帳戶有足夠餘額。
