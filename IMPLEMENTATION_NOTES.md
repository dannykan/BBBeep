# 實現說明

## 前端頁面實現狀態

### ✅ 已實現
- **Landing Page** (`/landing`) - 落地頁
- **Login Page** (`/login`) - 登入頁

### ⏳ 需要實現（可參考設計文檔）

以下頁面需要根據設計文檔 (`/Users/dannykan/Downloads/Landing Page Design/src/app/pages/`) 實現：

1. **Onboarding Page** (`/onboarding`)
   - 6步流程（駕駛）或5步流程（行人）
   - 用戶類型選擇、暱稱、車牌、點數說明

2. **Home Page** (`/home`)
   - 用戶資訊卡片
   - 點數顯示
   - 主要功能區（發送、收件箱、錢包）
   - 底部導航欄

3. **Send Page** (`/send`)
   - 多步驟流程：車牌輸入 → 類型選擇 → 範本選擇 → 補充說明 → AI改寫 → 確認發送

4. **Inbox Page** (`/inbox`)
   - 訊息列表
   - 訊息詳情抽屜
   - 封鎖/拒收功能

5. **Wallet Page** (`/wallet`)
   - 點數顯示
   - 儲值方案
   - 點數歷史

6. **Settings Page** (`/settings`)
   - 個人資料編輯
   - 通知設定入口
   - 封鎖列表入口
   - 條款/隱私入口

7. **Block List Page** (`/block-list`)
   - 封鎖名單
   - 拒收名單

8. **Notification Settings Page** (`/notification-settings`)
   - 通知開關設置

9. **Terms/Privacy Pages** (`/terms`, `/privacy`)
   - 條款和隱私政策內容

## 實現建議

### 1. 使用 React.memo 優化性能
所有頁面組件都應該使用 `React.memo` 包裹：

```typescript
const MyPage = React.memo(() => {
  // 頁面內容
});

MyPage.displayName = 'MyPage';
export default MyPage;
```

### 2. 使用動態導入（可選）
對於大型組件，可以使用動態導入：

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <div>Loading...</div>,
});
```

### 3. 錯誤邊界
建議添加錯誤邊界組件來處理頁面錯誤。

### 4. 路由保護
使用 middleware 或組件級保護來確保需要登入的頁面：

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function ProtectedPage() {
  const { user, isLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return <div>Loading...</div>;

  // 頁面內容
}
```

## 從設計文檔複製組件

設計文檔中的頁面位於：
`/Users/dannykan/Downloads/Landing Page Design/src/app/pages/`

可以參考這些文件來實現對應的 Next.js 頁面。主要差異：
- 使用 `useRouter` 而不是 `useNavigate`
- 使用 `next/navigation` 而不是 `react-router`
- 路徑結構：`app/[route]/page.tsx`

## UI 組件

已實現的 UI 組件位於：
`frontend/src/components/ui/`

如果需要更多組件，可以從設計文檔複製：
`/Users/dannykan/Downloads/Landing Page Design/src/app/components/ui/`

## 狀態管理

使用 `useApp()` hook 來訪問全局狀態：

```typescript
import { useApp } from '@/context/AppContext';

const { user, messages, login, logout } = useApp();
```

## API 調用

使用預定義的 API 服務：

```typescript
import { messagesApi, pointsApi } from '@/lib/api-services';

// 發送消息
await messagesApi.create({ ... });

// 獲取點數
const balance = await pointsApi.getBalance();
```

## 樣式指南

遵循 Modern Calm Blue 設計系統：
- 主色：`#4A6FA5` (primary)
- 深藍：`#3C5E8C` (primary-dark)
- 淡藍：`#EAF0F8` (primary-soft)

使用 Tailwind CSS 類名，參考 `tailwind.config.ts`。
