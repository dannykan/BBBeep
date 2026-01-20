'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';

const TermsPage = React.memo(() => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-base text-foreground">使用條款</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6">
        <Card className="p-6 space-y-6 bg-card border-border shadow-none">
          {/* 最後更新日期 */}
          <div className="text-sm text-muted-foreground">
            最後更新：2026 年 1 月 20 日
          </div>

          {/* 服務說明 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">1. 服務說明</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              「叭叭叭 BBBeep」是一個讓駕駛者可以私密發送善意提醒的系統。這不是聊天平台，而是一次性提醒服務。
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              本服務採用點數付費制度，用戶需要消耗點數來發送提醒。收到讚美可以獲得少量點數回饋。
            </p>
          </section>

          {/* 使用規範 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">2. 使用規範</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>• 提醒內容必須真實、善意，不得包含騷擾、辱罵或不當內容</p>
              <p>• 不得濫用服務發送垃圾訊息或廣告</p>
              <p>• 不得冒用他人車牌或提供虛假資訊</p>
              <p>• 行人/腳踏車用戶只能發送提醒，無法接收提醒</p>
              <p>• 汽車駕駛和機車騎士需填寫車牌才能發送和接收提醒</p>
            </div>
          </section>

          {/* 點數規則 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">3. 點數規則</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>• 新用戶註冊即獲得 8 點體驗點數</p>
              <p>• 發送基本提醒消耗 1 點，附加補充說明消耗額外 3 點</p>
              <p>• 收到讚美並回應可獲得 1 點回饋</p>
              <p>• 點數不可退款或轉讓</p>
              <p>• 點數無使用期限</p>
            </div>
          </section>

          {/* 免責聲明 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">4. 免責聲明</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>• 本服務僅提供訊息傳遞平台，不對提醒內容的真實性或準確性負責</p>
              <p>• 用戶應自行判斷提醒內容，並承擔使用本服務的風險</p>
              <p>• 若因不當使用本服務而產生任何糾紛或損失，本服務不承擔責任</p>
              <p>• 我們保留隨時暫停或終止服務的權利</p>
            </div>
          </section>

          {/* 帳號管理 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">5. 帳號管理</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>• 每個手機號碼只能註冊一個帳號</p>
              <p>• 用戶有責任保管自己的帳號資訊</p>
              <p>• 發現違規行為，我們有權暫停或終止帳號</p>
              <p>• 刪除帳號後，點數餘額將無法恢復</p>
            </div>
          </section>

          {/* 條款修改 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">6. 條款修改</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              我們保留隨時修改本使用條款的權利。條款更新後，繼續使用服務即表示您同意修改後的條款。
            </p>
          </section>

          {/* 聯繫方式 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">7. 聯繫我們</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              如對本使用條款有任何疑問，請透過 App 內的客服功能聯繫我們。
            </p>
          </section>
        </Card>
      </div>
    </div>
  );
});

TermsPage.displayName = 'TermsPage';

export default TermsPage;
