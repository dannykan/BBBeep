# 部署問題排查紀錄

## 2026-01-21 部署問題總結

### 問題 1: Backend - axios 模組找不到
**錯誤訊息:**
```
Module not found: Error: Can't resolve 'axios' in '/app/src/auth'
```

**原因:**
- Monorepo 使用 npm workspaces，`package-lock.json` 只存在於根目錄
- Docker build 時只複製 backend 資料夾，沒有正確的 `package-lock.json`

**解決方案:**
1. 為 backend 生成獨立的 `package-lock.json`：
```bash
cd /tmp && mkdir backend-lockfile
cp /path/to/backend/package.json backend-lockfile/
cd backend-lockfile && npm install --package-lock-only
cp package-lock.json /path/to/backend/
```
2. Dockerfile 使用 `npm ci` 確保嚴格按照 lock file 安裝

---

### 問題 2: Frontend - useSearchParams 需要 Suspense
**錯誤訊息:**
```
useSearchParams() should be wrapped in a suspense boundary at page "/auth/line/callback"
```

**原因:**
- Next.js 14 要求使用 `useSearchParams()` 的元件必須包在 `<Suspense>` 裡

**解決方案:**
```tsx
function PageContent() {
  const searchParams = useSearchParams();
  // ...
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent />
    </Suspense>
  );
}
```

---

### 問題 3: Backend - webpack 模組找不到
**錯誤訊息:**
```
Error: Cannot find module 'webpack'
```

**原因:**
- NestJS CLI 需要 webpack 作為 dev dependency
- 獨立的 backend `package-lock.json` 沒有包含 webpack

**解決方案:**
```bash
cd backend && npm install --save-dev webpack
```
然後重新生成 `package-lock.json`

---

### 問題 4: Backend - uuid ESM 模組錯誤
**錯誤訊息:**
```
Error [ERR_REQUIRE_ESM]: require() of ES Module /app/node_modules/uuid/dist-node/index.js not supported
```

**原因:**
- uuid v9+ 是 ESM-only 模組
- NestJS 使用 CommonJS，無法直接 require ESM 模組

**解決方案:**
```bash
npm uninstall uuid
npm install uuid@^8.3.2  # v8 支援 CommonJS
```

---

### 問題 5: Backend - 權限錯誤無法建立資料夾
**錯誤訊息:**
```
Error: EACCES: permission denied, mkdir '/app/uploads'
```

**原因:**
- Docker 容器以非 root 用戶 (nestjs, uid 1001) 運行
- 該用戶沒有在 `/app` 建立新資料夾的權限

**解決方案:**
1. 改用 memory storage 處理檔案上傳，返回 base64 data URL
2. 移除 `main.ts` 中建立 uploads 資料夾的程式碼

```typescript
// upload.controller.ts - 使用 memoryStorage
import { memoryStorage } from 'multer';

@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(), // 不是 diskStorage
    // ...
  }),
)
```

---

## 最佳實踐

### Backend Docker 部署
1. **獨立的 package-lock.json**: Monorepo 中的 backend 需要自己的 `package-lock.json`
2. **使用 npm ci**: Dockerfile 中使用 `npm ci` 而不是 `npm install`
3. **避免 ESM-only 套件**: 檢查套件是否支援 CommonJS（uuid, chalk 等常見問題）
4. **避免寫入檔案系統**: 使用 memory storage 或雲端儲存（R2, S3）

### Frontend (Next.js) 部署
1. **Suspense boundary**: 使用 `useSearchParams()` 的頁面需要 Suspense
2. **Dynamic imports**: 避免 static generation 問題

---

### 問題 6: Backend - 資料庫欄位不存在
**錯誤訊息:**
```
The column `User.freePoints` does not exist in the current database.
```

**原因:**
- 新增的 Prisma migration 沒有在生產資料庫執行
- Railway 的 build 階段無法連接內部資料庫 (`postgres.railway.internal`)

**解決方案:**
使用公開資料庫 URL 手動執行 migration：
```bash
# 取得公開 DATABASE_URL（從 Railway PostgreSQL 服務的 Variables tab）
# 格式: postgresql://postgres:密碼@主機.railway.app:埠號/railway

DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

如果出現 `P3005: The database schema is not empty` 錯誤，需要先標記已存在的 migrations：
```bash
export DATABASE_URL="postgresql://..."

# 標記已存在的 migrations 為已套用
npx prisma migrate resolve --applied 20260119143226_init_migration
npx prisma migrate resolve --applied 20260119152025_202601192320
# ... 對每個已存在的 migration 執行

# 然後執行新的 migration
npx prisma migrate deploy
```

如果 migration 被標記為已套用但 SQL 沒實際執行，需要手動執行 SQL：
```bash
DATABASE_URL="postgresql://..." npx prisma db execute --file prisma/migrations/xxxxxxxx_migration_name/migration.sql
```

---

### 問題 7: Railway - NIXPACKS vs Dockerfile
**問題:**
- Railway 自動偵測到 Dockerfile 就會使用它
- 如果要用 NIXPACKS，需要刪除或重新命名 Dockerfile

**railway.json 設定:**
```json
{
  "build": {
    "builder": "DOCKERFILE"  // 使用 Dockerfile（推薦，有更好的 cache）
  },
  "deploy": {
    "startCommand": "node dist/main"
  }
}
```

**注意:**
- NIXPACKS build 較慢（每次都要重新安裝 node_modules）
- Dockerfile 有多階段 build 和 layer cache，速度更快

---

### 問題 8: Railway - Prisma 權限錯誤
**錯誤訊息:**
```
Error: Can't write to /app/node_modules/@prisma/engines
```

**原因:**
- 在 runtime 執行 `npx prisma migrate deploy` 會嘗試下載/寫入 engines
- Container 可能沒有寫入權限

**解決方案:**
- 不要在 startCommand 執行 migration
- 使用公開資料庫 URL 在本地執行 migration（如問題 6）

---

### 問題 9: LINE Login 環境變數
**錯誤訊息:**
```
[LINE_LOGIN] Error: LINE 設定不完整
```

**原因:**
- Frontend 和 Backend 都需要設定 LINE 環境變數

**Frontend (Cloudflare Pages) 環境變數:**
```
NEXT_PUBLIC_LINE_CHANNEL_ID=你的Channel ID
NEXT_PUBLIC_LINE_CALLBACK_URL=https://你的網域/auth/line/callback
NEXT_PUBLIC_LOGIN_METHODS=line
```

**Backend (Railway) 環境變數:**
```
LINE_CHANNEL_ID=你的Channel ID
LINE_CHANNEL_SECRET=你的Channel Secret
LINE_CALLBACK_URL=https://你的網域/auth/line/callback
```

**注意:**
- 環境變數值不能有多餘的空格（前後都要檢查）
- `LINE_CALLBACK_URL` 必須與 LINE Developers Console 設定的完全一致
- Frontend 的 `NEXT_PUBLIC_*` 變數需要重新 build 才會生效

---

### 問題 10: LINE Login - redirect_uri malformed
**錯誤訊息:**
```
error: 'invalid_request',
error_description: 'the redirect_uri is malformed'
```

**原因:**
- 環境變數值有多餘的空格或特殊字元
- URL 格式錯誤（缺少 `https://`）
- URL 與 LINE Developers Console 設定不一致

**解決方案:**
1. 刪除環境變數，重新手動輸入（不要複製貼上）
2. 確認 URL 格式正確：`https://domain.com/auth/line/callback`
3. 確認 LINE Developers Console 的 Callback URL 設定相同

---

## 最佳實踐

### Backend Docker 部署
1. **獨立的 package-lock.json**: Monorepo 中的 backend 需要自己的 `package-lock.json`
2. **使用 npm ci**: Dockerfile 中使用 `npm ci` 而不是 `npm install`
3. **避免 ESM-only 套件**: 檢查套件是否支援 CommonJS（uuid, chalk 等常見問題）
4. **避免寫入檔案系統**: 使用 memory storage 或雲端儲存（R2, S3）
5. **使用 Dockerfile 而非 NIXPACKS**: 更好的 cache，更快的 build

### Frontend (Next.js) 部署
1. **Suspense boundary**: 使用 `useSearchParams()` 的頁面需要 Suspense
2. **Dynamic imports**: 避免 static generation 問題
3. **NEXT_PUBLIC_* 變數**: 修改後需要重新 build

### Railway Migration 流程
1. **不要在 build/start 階段執行 migration** - 內部資料庫無法從 build 階段存取
2. **使用公開資料庫 URL 執行 migration**:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```
3. **新功能部署流程**:
   - Push 程式碼
   - 等待 build 完成
   - 手動執行 migration
   - 重啟服務（如需要）

### 檢查清單
- [ ] backend/package-lock.json 存在且包含所有依賴
- [ ] 沒有使用 ESM-only 套件
- [ ] 沒有在容器中寫入檔案系統
- [ ] useSearchParams 有 Suspense boundary
- [ ] Frontend LINE 環境變數已設定（NEXT_PUBLIC_LINE_*）
- [ ] Backend LINE 環境變數已設定（LINE_*）
- [ ] 新的 Prisma migration 已在生產環境執行
- [ ] 環境變數值沒有多餘空格
