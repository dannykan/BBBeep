'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Mail, MessageCircle, HelpCircle, ChevronRight } from 'lucide-react';

const SupportPage = React.memo(() => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4">
          <h1 className="text-base text-foreground text-center">客服支援</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* 聯絡我們 */}
        <Card className="p-6 space-y-4 bg-card border-border shadow-none">
          <h2 className="text-lg text-foreground font-medium">聯絡我們</h2>

          <a
            href="mailto:dannytjkan@gmail.com"
            className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Email 支援</p>
              <p className="text-sm text-muted-foreground">dannytjkan@gmail.com</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </a>

          <p className="text-sm text-muted-foreground">
            我們會在 1-2 個工作日內回覆您的問題。
          </p>
        </Card>

        {/* 常見問題 */}
        <Card className="p-6 space-y-4 bg-card border-border shadow-none">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg text-foreground font-medium">常見問題</h2>
          </div>

          <div className="space-y-4">
            <FAQItem
              question="什麼是 UBeep？"
              answer="UBeep 是一個匿名的行車提醒平台，讓您可以透過車牌號碼向其他車主發送善意提醒，例如車燈未關、車門未關等情況。"
            />
            <FAQItem
              question="如何發送提醒？"
              answer="登入後，在首頁輸入對方的車牌號碼，選擇提醒類別，然後選擇或編輯訊息內容即可發送。"
            />
            <FAQItem
              question="發送提醒需要付費嗎？"
              answer="發送提醒需要消耗點數。新用戶註冊後會獲得免費點數，之後可以透過購買或邀請好友獲得更多點數。"
            />
            <FAQItem
              question="對方會知道是誰發送的嗎？"
              answer="不會。所有提醒都是匿名發送的，接收者無法看到發送者的任何個人資訊。"
            />
            <FAQItem
              question="如何阻擋不想收到的訊息？"
              answer="您可以在收到訊息後選擇「封鎖」該發送者，之後就不會再收到來自該用戶的訊息。"
            />
            <FAQItem
              question="如何刪除我的帳號？"
              answer="請前往「設定」>「帳號管理」>「刪除帳號」。請注意，刪除帳號後所有資料將無法恢復，包括剩餘點數。"
            />
          </div>
        </Card>

        {/* 回報問題 */}
        <Card className="p-6 space-y-4 bg-card border-border shadow-none">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg text-foreground font-medium">回報問題</h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            如果您在使用過程中遇到任何問題或有任何建議，歡迎透過 Email 聯繫我們。請盡量提供以下資訊，以便我們更快速地協助您：
          </p>

          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• 您使用的裝置型號與系統版本</li>
            <li>• 問題發生的時間與步驟</li>
            <li>• 截圖或螢幕錄影（如有）</li>
          </ul>
        </Card>

        {/* 服務時間 */}
        <Card className="p-6 space-y-2 bg-card border-border shadow-none">
          <h2 className="text-lg text-foreground font-medium">服務時間</h2>
          <p className="text-sm text-muted-foreground">
            週一至週五 09:00 - 18:00（台灣時間）
          </p>
          <p className="text-sm text-muted-foreground">
            國定假日休息
          </p>
        </Card>

        {/* Footer Links */}
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <a href="/privacy" className="hover:text-foreground transition-colors">隱私權政策</a>
          <a href="/terms" className="hover:text-foreground transition-colors">服務條款</a>
        </div>
      </div>
    </div>
  );
});

// FAQ Item Component
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="border-b border-border last:border-0 pb-4 last:pb-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between gap-2 text-left"
      >
        <span className="text-sm font-medium text-foreground">{question}</span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </p>
      )}
    </div>
  );
};

SupportPage.displayName = 'SupportPage';

export default SupportPage;
