'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, Shield, Coins, UserPlus, LogIn } from 'lucide-react';

const LandingPage = React.memo(() => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-2xl tracking-tight text-foreground">
            一句善意提醒<br />讓路上少一點誤會
          </h1>
          <p className="text-muted-foreground">私密、不公開、不對罵</p>
        </div>

        <div className="space-y-3">
          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div className="text-sm space-y-0.5">
                <p className="text-foreground">不公開車牌、不公開任何個人資訊</p>
                <p className="text-muted-foreground text-xs">完全保護隱私</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div className="text-sm space-y-0.5">
                <p className="text-foreground">不顯示對方身分</p>
                <p className="text-muted-foreground text-xs">單向提醒，安全無壓力</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-start gap-3">
              <Coins className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div className="text-sm space-y-0.5">
                <p className="text-foreground">使用需點數</p>
                <p className="text-muted-foreground text-xs">註冊即贈 8 點免費體驗</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full h-12 bg-primary hover:bg-primary-dark text-white"
            onClick={() => router.push('/login')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            立即註冊（送 8 點）
          </Button>

          <button
            onClick={() => router.push('/login')}
            className="w-full h-12 bg-card border-2 border-border hover:border-primary text-foreground rounded-xl transition-all font-medium flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            已有帳號？登入
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            這不是聊天平台，而是一次性的善意提醒服務
          </p>
        </div>
      </div>
    </div>
  );
});

LandingPage.displayName = 'LandingPage';

export default LandingPage;
