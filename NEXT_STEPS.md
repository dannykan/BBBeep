# 下一步工作指南

## ✅ 已完成的核心功能

1. **後端 API** - 完整實現
2. **前端基礎架構** - 完成
3. **核心頁面** - Landing, Login, Onboarding, Home
4. **狀態管理** - Context API 實現
5. **UI 組件庫** - 基礎組件完成
6. **底部導航** - 實現完成

## 📝 待實現的頁面

以下頁面可以參考設計文檔 (`/Users/dannykan/Downloads/Landing Page Design/src/app/pages/`) 實現：

### 高優先級
1. **Send Page** (`/send`) - 發送提醒流程
   - 多步驟流程：車牌輸入 → 類型選擇 → 範本選擇 → 補充說明 → AI改寫 → 確認發送
   - 參考：`SendPage.tsx`

2. **Inbox Page** (`/inbox`) - 收件箱
   - 訊息列表
   - 訊息詳情抽屜
   - 封鎖/拒收功能
   - 參考：`InboxPage.tsx`

### 中優先級
3. **Wallet Page** (`/wallet`) - 錢包
   - 點數顯示
   - 儲值方案選擇
   - 點數歷史記錄
   - 參考：`WalletPage.tsx`

4. **Settings Page** (`/settings`) - 設置
   - 個人資料編輯
   - 通知設定入口
   - 封鎖列表入口
   - 條款/隱私入口
   - 參考：`SettingsPage.tsx`

5. **Block List Page** (`/block-list`) - 封鎖列表
   - 封鎖名單
   - 拒收名單
   - 參考：`BlockListPage.tsx`

### 低優先級
6. **Notification Settings Page** (`/notification-settings`)
   - 參考：`NotificationSettingsPage.tsx`

7. **Terms/Privacy Pages** (`/terms`, `/privacy`)
   - 參考：`TermsPage.tsx`, `PrivacyPage.tsx`

## 🔧 實現建議

### 1. 頁面結構模板

```typescript
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import BottomNav from '@/components/layout/BottomNav';

const MyPage = React.memo(() => {
  const router = useRouter();
  const { user, isLoading } = useApp();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <div>載入中...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 頁面內容 */}
      <BottomNav />
    </div>
  );
});

MyPage.displayName = 'MyPage';
export default MyPage;
```

### 2. API 調用示例

```typescript
import { messagesApi, pointsApi, usersApi } from '@/lib/api-services';
import { toast } from 'sonner';

// 發送消息
const handleSend = async () => {
  try {
    await messagesApi.create({
      licensePlate: 'ABC-1234',
      type: '車況提醒',
      template: '您的車燈未開',
      customText: '補充說明',
      useAiRewrite: false,
    });
    toast.success('提醒已發送');
    router.push('/home');
  } catch (error: any) {
    toast.error(error.response?.data?.message || '發送失敗');
  }
};
```

### 3. 使用設計文檔中的組件

設計文檔中的組件位於：
- `/Users/dannykan/Downloads/Landing Page Design/src/app/components/ui/`

可以直接複製需要的組件到：
- `frontend/src/components/ui/`

### 4. 車輛模板數據

車輛模板數據位於：
- `/Users/dannykan/Downloads/Landing Page Design/src/app/data/vehicleTemplates.ts`

可以創建類似的文件在：
- `frontend/src/data/vehicleTemplates.ts`

## 🚀 快速開始實現

1. **選擇一個頁面**（建議從 Send Page 開始）
2. **參考設計文檔**中的對應文件
3. **轉換為 Next.js 格式**：
   - `useNavigate` → `useRouter`
   - `react-router` → `next/navigation`
   - 路徑：`app/[route]/page.tsx`
4. **使用已實現的 API 服務**
5. **添加錯誤處理和載入狀態**
6. **測試功能**

## 📚 參考資源

- **UI Flow 文檔**: `/Users/dannykan/Downloads/UI_FLOW.md`
- **設計文檔**: `/Users/dannykan/Downloads/Landing Page Design/`
- **實現說明**: `IMPLEMENTATION_NOTES.md`
- **API 文檔**: http://localhost:3001/api (Swagger)

## 💡 提示

- 所有頁面都應該使用 `React.memo` 包裹以優化性能
- 需要登入的頁面應該檢查 `user` 狀態
- 使用 `toast` 來顯示成功/錯誤訊息
- 使用 `BottomNav` 組件在需要導航的頁面
- 遵循 Modern Calm Blue 設計系統
