# LINE 登入整合可行性評估報告

## 專案現況分析

### 當前架構
- **後端框架**: NestJS (Node.js)
- **前端框架**: Next.js 14 (React)
- **資料庫**: PostgreSQL (使用 Prisma ORM)
- **認證方式**: JWT Token
- **快取系統**: Redis (用於 OTP 驗證碼管理)

### 當前認證流程
1. **手機號碼 + OTP 驗證碼登入** (首次註冊)
2. **手機號碼 + 密碼登入** (已註冊用戶)
3. 使用 Redis 管理驗證碼和錯誤計數
4. JWT Token 作為授權憑證

---

## LINE 登入整合方案

### 一、LINE Login 基本整合

#### 1.1 技術架構
```
用戶 → LINE 授權頁面 → LINE 同意授權 → 回調您的網站
     → 後端獲取 Access Token → 獲取用戶資訊
     → 建立/更新用戶 → 發放 JWT Token
```

#### 1.2 所需 LINE 服務
- **LINE Login**: 第三方登入功能
- **LINE Messaging API**: 發送通知訊息給用戶（官方帳號）

#### 1.3 實作步驟

**步驟 1: 申請 LINE Developer 帳號**
1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立新的 Provider
3. 建立 LINE Login Channel（用於登入）
4. 建立 Messaging API Channel（用於發送通知）

**步驟 2: 資料庫 Schema 調整**
```prisma
model User {
  id                     String       @id @default(cuid())
  phone                  String?      @unique  // 改為可選
  lineUserId             String?      @unique  // 新增 LINE User ID
  lineDisplayName        String?              // LINE 顯示名稱
  linePictureUrl         String?              // LINE 頭像
  lineEmail              String?              // LINE Email
  lineAccessToken        String?              // LINE Access Token (用於發送通知)
  lineRefreshToken       String?              // LINE Refresh Token
  lineTokenExpiry        DateTime?            // Token 過期時間
  password               String?
  nickname               String?
  licensePlate           String?
  userType               UserType
  vehicleType            VehicleType?
  points                 Int          @default(0)
  hasCompletedOnboarding Boolean      @default(false)
  email                  String?
  createdAt              DateTime     @default(now())
  updatedAt              DateTime     @updatedAt

  // ... 其他關聯保持不變
}
```

**步驟 3: 後端 API 實作**

需要新增的 npm 套件:
```json
{
  "dependencies": {
    "axios": "^1.6.0",  // 已安裝
    "@line/bot-sdk": "^8.0.0"  // 新增
  }
}
```

新增檔案結構:
```
backend/src/
├── auth/
│   ├── strategies/
│   │   └── line.strategy.ts      // LINE 登入策略
│   ├── dto/
│   │   └── line-login.dto.ts     // LINE 登入 DTO
│   ├── auth.controller.ts         // 新增 LINE 相關端點
│   └── auth.service.ts            // 新增 LINE 登入邏輯
├── line/
│   ├── line.module.ts
│   ├── line.service.ts            // LINE Messaging API 服務
│   └── line.controller.ts         // LINE Webhook 處理
```

**步驟 4: 環境變數配置**
```env
# LINE Login
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CALLBACK_URL=https://yourdomain.com/api/auth/line/callback

# LINE Messaging API
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=your_messaging_token
LINE_MESSAGING_CHANNEL_SECRET=your_messaging_secret
```

**步驟 5: 前端整合**

新增 LINE 登入按鈕:
```tsx
// frontend/src/components/LineLoginButton.tsx
export function LineLoginButton() {
  const handleLineLogin = () => {
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code&` +
      `client_id=${process.env.NEXT_PUBLIC_LINE_CHANNEL_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_LINE_CALLBACK_URL)}&` +
      `state=${generateRandomState()}&` +
      `scope=profile%20openid%20email`;

    window.location.href = lineAuthUrl;
  };

  return (
    <button onClick={handleLineLogin}>
      使用 LINE 登入
    </button>
  );
}
```

---

### 二、LINE 官方帳號整合（加好友 + 通知）

#### 2.1 實作流程

**方案 A: 強制加好友後才能使用完整功能**
```
LINE 登入 → 檢查是否已加官方帳號 →
  ├─ 已加好友: 正常使用
  └─ 未加好友: 顯示提示頁面，引導加好友 → 加好友後啟用通知功能
```

**方案 B: 可選擇性加好友（推薦）**
```
LINE 登入成功 → 顯示通知設定頁面 →
  ├─ 用戶選擇啟用 LINE 通知: 引導加官方帳號
  └─ 用戶選擇不啟用: 僅使用網頁通知
```

#### 2.2 加好友檢測機制

使用 LINE Messaging API 檢查用戶是否已加好友:
```typescript
// backend/src/line/line.service.ts
async checkUserFriendship(lineUserId: string): Promise<boolean> {
  try {
    const profile = await this.lineClient.getProfile(lineUserId);
    return true; // 如果能取得 profile，表示已加好友
  } catch (error) {
    if (error.statusCode === 404) {
      return false; // 404 表示未加好友
    }
    throw error;
  }
}
```

#### 2.3 通知訊息發送

```typescript
// 發送訊息範例
async sendNotification(lineUserId: string, message: string) {
  return this.lineClient.pushMessage(lineUserId, {
    type: 'text',
    text: message
  });
}

// 發送車況提醒
async sendVehicleReminder(userId: string, message: Message) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { lineUserId: true, lineAccessToken: true }
  });

  if (!user.lineUserId || !user.lineAccessToken) {
    return; // 用戶未綁定 LINE 或未授權通知
  }

  await this.sendNotification(user.lineUserId,
    `【BBBeeep 車況提醒】\n${message.template}\n${message.customText || ''}`
  );
}
```

#### 2.4 通知設定資料表

新增通知偏好設定:
```prisma
model NotificationSettings {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])

  lineEnabled     Boolean  @default(false)  // LINE 通知開關
  emailEnabled    Boolean  @default(false)  // Email 通知開關
  webEnabled      Boolean  @default(true)   // 網頁通知開關

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 三、實作時程估算

| 階段 | 工作項目 | 預估時間 |
|------|---------|---------|
| **階段 1** | LINE Developer 申請與設定 | 1 天 |
| **階段 2** | 資料庫 Schema 調整與遷移 | 0.5 天 |
| **階段 3** | 後端 LINE Login API 實作 | 2 天 |
| **階段 4** | 前端 LINE 登入整合 | 1 天 |
| **階段 5** | LINE Messaging API 整合 | 2 天 |
| **階段 6** | 通知功能實作（各種訊息類型） | 2 天 |
| **階段 7** | 測試與除錯 | 2 天 |
| **階段 8** | 部署與上線 | 1 天 |
| **總計** | | **11.5 天** |

---

## 四、成本分析

### LINE 官方帳號費用
- **免費方案**:
  - 每月 500 則訊息免費
  - 適合測試或小規模使用

- **輕用量方案**: NT$ 800/月
  - 每月 4,000 則訊息
  - 超過部分 NT$ 0.2/則

- **中用量方案**: NT$ 4,000/月
  - 每月 25,000 則訊息
  - 超過部分 NT$ 0.15/則

### 使用量估算
假設您有 1,000 位活躍用戶，每位用戶每月收到 5 則通知:
- 每月訊息量: 1,000 × 5 = 5,000 則
- 建議方案: **輕用量方案** (NT$ 800/月)

---

## 五、優勢與限制

### ✅ 優勢
1. **降低登入門檻**: 無需記憶密碼，使用 LINE 即可登入
2. **提高到達率**: LINE 通知比 Email 更容易被看到（開啟率高）
3. **用戶體驗佳**: 台灣用戶對 LINE 接受度高
4. **整合容易**: LINE 提供完整的 SDK 和文檔
5. **官方認證**: 使用官方帳號可提升品牌信任度

### ⚠️ 限制與注意事項
1. **用戶必須加好友**: 才能接收訊息通知（可透過引導提高加好友率）
2. **成本考量**: 訊息量大時需付費
3. **訊息限制**: LINE 對訊息內容有審查機制，需避免垃圾訊息
4. **相依性**: 依賴 LINE 平台，若 LINE 政策改變可能受影響
5. **隱私考量**: 需妥善保管用戶的 LINE Token

---

## 六、建議實作策略

### 階段式推出
1. **第一階段**: 實作 LINE Login（保留原有手機號碼登入）
2. **第二階段**: 整合 LINE 官方帳號，提供加好友選項
3. **第三階段**: 開放 LINE 通知功能（可選擇性啟用）
4. **第四階段**: 根據使用數據優化通知內容與頻率

### 向下相容
- 保留現有的手機號碼登入方式
- LINE 登入作為替代選項
- 允許用戶綁定多種登入方式

### 通知策略
```
優先順序:
1. LINE 通知（如果用戶已啟用）
2. 網頁內通知（備案）
3. Email 通知（重要訊息）
```

---

## 七、安全性考量

1. **Token 安全儲存**
   - LINE Access Token 加密儲存
   - 使用環境變數儲存敏感資訊

2. **State 參數驗證**
   - 防止 CSRF 攻擊
   - 使用隨機 state 參數並驗證

3. **Webhook 驗證**
   - 驗證 LINE Webhook 簽名
   - 防止偽造請求

4. **Token 刷新機制**
   - 定期刷新 Access Token
   - 處理 Token 過期情況

---

## 八、結論與建議

### 可行性評估: ✅ **高度可行**

您的專案架構完全支援 LINE 登入整合，具體建議如下:

1. **優先實作 LINE Login**: 可顯著提升用戶體驗和註冊轉換率
2. **分階段推出 LINE 通知**: 先讓用戶適應 LINE 登入，再推廣加好友功能
3. **保留多元登入方式**: 不要移除手機號碼登入，給用戶選擇權
4. **成本控制**: 從免費方案開始，根據實際使用量調整

### 推薦的最小可行產品 (MVP)
1. LINE Login 基本功能
2. 引導用戶加官方帳號（非強制）
3. 重要通知（如收到新訊息）發送到 LINE

### 下一步行動
1. 申請 LINE Developer 帳號
2. 確認通知訊息內容規劃
3. 決定是否要強制用戶加好友
4. 開始進行資料庫 Schema 調整

---

## 附錄: 參考資源

- [LINE Login 官方文檔](https://developers.line.biz/en/docs/line-login/)
- [LINE Messaging API 文檔](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Bot SDK Node.js](https://github.com/line/line-bot-sdk-nodejs)
- [LINE 官方帳號費用](https://tw.linebiz.com/service/messaging-api/)

---

**報告日期**: 2026-01-20
**專案**: BBBeeep 平台
**評估者**: AI Assistant
