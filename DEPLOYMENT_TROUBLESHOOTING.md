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

### 檢查清單
- [ ] backend/package-lock.json 存在且包含所有依賴
- [ ] 沒有使用 ESM-only 套件
- [ ] 沒有在容器中寫入檔案系統
- [ ] useSearchParams 有 Suspense boundary
