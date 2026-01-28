'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';

const PrivacyPage = React.memo(() => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between relative">
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">隱私權政策</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-6">
        <Card className="p-6 space-y-6 bg-card border-border shadow-none">
          {/* 最後更新日期 */}
          <div className="text-sm text-muted-foreground">
            最後更新：2026 年 1 月 29 日
          </div>

          {/* 前言 */}
          <section className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              「UBeep」重視您的隱私權。本政策說明我們如何收集、使用和保護您的個人資料。
            </p>
          </section>

          {/* 收集的資訊 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">1. 我們收集的資訊</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground">必要資訊：</p>
              <p>• 手機號碼（用於帳號登入與驗證）</p>
              <p>• 車牌號碼（僅限汽車駕駛與機車騎士，用於接收提醒）</p>
              <p>• 用戶類型（駕駛或行人）</p>

              <p className="font-medium text-foreground mt-3">選填資訊：</p>
              <p>• 暱稱（用於個人化體驗）</p>
              <p>• 電子郵件（用於通知設定）</p>

              <p className="font-medium text-foreground mt-3">自動收集：</p>
              <p>• 使用紀錄（發送與接收的提醒）</p>
              <p>• 點數交易紀錄</p>
              <p>• 封鎖/拒收名單</p>

              <p className="font-medium text-foreground mt-3">分析資料（用於改善服務）：</p>
              <p>• 裝置資訊（型號、作業系統版本）</p>
              <p>• App 使用情況（頁面瀏覽、功能使用頻率）</p>
              <p>• 匿名效能數據</p>
              <p className="text-xs mt-1">註：這些資料透過 Firebase Analytics 收集，不包含可識別個人身分的資訊</p>
            </div>
          </section>

          {/* 資訊使用方式 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">2. 資訊使用方式</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>• 提供核心服務功能（發送與接收提醒）</p>
              <p>• 驗證用戶身分與車輛資訊</p>
              <p>• 處理點數交易與儲值</p>
              <p>• 發送服務通知（若您提供電子郵件）</p>
              <p>• 改善服務品質與用戶體驗</p>
              <p>• 防止濫用與違規行為</p>
            </div>
          </section>

          {/* 資訊分享與揭露 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">3. 資訊分享與揭露</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground">
                我們不會將您的個人資料出售給第三方。
              </p>

              <p className="mt-3">資料可能在以下情況下被揭露：</p>
              <p>• 法律要求或配合執法機關調查</p>
              <p>• 保護服務安全與其他用戶權益</p>
              <p>• 經您明確同意的情況</p>
              <p>• 提供服務所需的技術服務商（已簽署保密協議）</p>
            </div>
          </section>

          {/* 資料保護 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">4. 資料保護措施</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>• 採用業界標準的加密技術保護資料傳輸</p>
              <p>• 嚴格控管資料存取權限</p>
              <p>• 定期進行安全性檢查與更新</p>
              <p>• 提供封鎖/拒收功能保護您的隱私</p>
            </div>
          </section>

          {/* 匿名性保護 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">5. 匿名性保護</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>• 提醒發送者的身分資訊不會揭露給接收者</p>
              <p>• 系統不會顯示發送者的手機號碼或個人資料</p>
              <p>• 這是一次性提醒服務，不提供雙向通訊</p>
              <p>• 行人用戶無需提供車牌，保護個人隱私</p>
            </div>
          </section>

          {/* 您的權利 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">6. 您的權利</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>• 隨時查看與修改個人資料</p>
              <p>• 管理封鎖/拒收名單</p>
              <p>• 選擇是否提供選填資訊（如暱稱、電子郵件）</p>
              <p>• 隨時刪除帳號（注意：點數餘額將無法恢復）</p>
              <p>• 要求查詢、更正或刪除個人資料</p>
            </div>
          </section>

          {/* Cookie 與追蹤技術 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">7. 分析工具與追蹤技術</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>我們使用 Firebase Analytics（由 Google 提供）來改善服務品質：</p>
              <p>• 了解 App 使用情況與熱門功能</p>
              <p>• 發現並修復技術問題</p>
              <p>• 優化用戶體驗</p>
              <p className="mt-2">
                Firebase Analytics 收集的是匿名彙整資料，不會追蹤您的個人瀏覽行為或與廣告商分享。
                您可以在裝置設定中限制廣告追蹤來減少資料收集。
              </p>
            </div>
          </section>

          {/* 兒童隱私 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">8. 兒童隱私</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              本服務適用於 18 歲以上具有駕駛資格的用戶。我們不會故意收集未成年人的個人資料。
            </p>
          </section>

          {/* 政策變更 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">9. 政策變更</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              我們可能會不時更新本隱私權政策。重大變更時，我們會透過 App 通知您。繼續使用服務即表示您接受更新後的政策。
            </p>
          </section>

          {/* 聯繫方式 */}
          <section className="space-y-3">
            <h2 className="text-base text-foreground font-medium">10. 聯繫我們</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              如對本隱私權政策有任何疑問或需要行使您的權利，請透過 App 內的客服功能聯繫我們。
            </p>
          </section>
        </Card>
      </div>
    </div>
  );
});

PrivacyPage.displayName = 'PrivacyPage';

export default PrivacyPage;
