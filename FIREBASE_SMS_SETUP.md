# Firebase SMS 整合指南

## 1. 設置 Firebase 項目

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 創建新項目或選擇現有項目
3. 啟用 **Authentication** > **Sign-in method** > **Phone**

## 2. 獲取 Service Account Key

1. 前往 **Project Settings** > **Service accounts**
2. 點擊 **Generate new private key**
3. 下載 JSON 文件

## 3. 安裝 Firebase Admin SDK

```bash
cd backend
npm install firebase-admin
```

## 4. 配置環境變數

在 `backend/.env` 中添加：

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

## 5. 更新後端代碼

我會在 `backend/src/auth/auth.service.ts` 中添加 Firebase 整合：

```typescript
import * as admin from 'firebase-admin';

// 初始化 Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

// 在 verifyPhone 方法中使用
const phoneNumber = `+886${dto.phone.slice(1)}`; // 轉換為國際格式
// 使用 Firebase Admin SDK 發送驗證碼
```

## 6. 注意事項

- Firebase Phone Auth 有免費額度限制（每月 10,000 次）
- 生產環境需要配置 App Check 以提高安全性
- 驗證碼有效期為 5 分鐘

## 7. 測試

在開發環境中，可以暫時保留模擬驗證碼功能，生產環境再切換到 Firebase。
