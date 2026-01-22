'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Send, Inbox, Wallet, Settings, AlertCircle, User, Car, Bike, History, Gift, Copy, Share2, Users } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { displayLicensePlate } from '@/lib/license-plate-format';
import { getTotalPoints } from '@/lib/utils';
import { inviteApi } from '@/lib/api-services';
import type { InviteCodeResponse } from '@/types';
import { toast } from 'sonner';

const HomePage = React.memo(() => {
  const router = useRouter();
  const { user, messages, isLoading, refreshUser, refreshMessages } = useApp();

  // Invite code state
  const [inviteData, setInviteData] = useState<InviteCodeResponse | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && !user.hasCompletedOnboarding) {
      router.push('/onboarding');
    }
    // 注意：不要在 useEffect 中调用 refreshMessages 和 refreshUser
    // 因为 AppContext 的初始化已经会刷新数据，重复调用可能导致无限循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router]);

  // Load invite code data
  useEffect(() => {
    const loadInviteData = async () => {
      setIsLoadingInvite(true);
      try {
        const data = await inviteApi.getMyCode();
        setInviteData(data);
      } catch (error) {
        console.error('Failed to load invite data:', error);
      } finally {
        setIsLoadingInvite(false);
      }
    };
    if (user) {
      loadInviteData();
    }
  }, [user]);

  const handleCopyInviteCode = () => {
    if (inviteData?.inviteCode) {
      navigator.clipboard.writeText(inviteData.inviteCode);
      toast.success('邀請碼已複製');
    }
  };

  const handleShareInviteCode = async () => {
    if (!inviteData?.inviteCode) return;

    const shareText = `來用 BBBeep 提醒路上的朋友吧！使用我的邀請碼 ${inviteData.inviteCode}，你我各得 10 點！`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BBBeep 邀請碼',
          text: shareText,
        });
      } catch (error) {
        // User cancelled or share failed, fall back to copy
        navigator.clipboard.writeText(shareText);
        toast.success('邀請訊息已複製');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('邀請訊息已複製');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  const unreadCount = messages.filter((m) => !m.read).length;
  const isLowPoints = (getTotalPoints(user)) < 5;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            {user?.nickname && (
              <div className="text-xs text-muted-foreground mb-0.5">暱稱</div>
            )}
            <div className="text-lg font-medium text-foreground flex items-center gap-2">
              {user?.userType === 'pedestrian' ? (
                <>
                  <User className="h-4 w-4" />
                  {user?.nickname || '行人用戶'}
                </>
              ) : (
                <>
                  {user?.vehicleType === 'car' ? (
                    <Car className="h-4 w-4" />
                  ) : (
                    <Bike className="h-4 w-4" />
                  )}
                  {user?.nickname ? (
                    <div className="flex flex-col">
                      <span className="text-sm">{user.nickname}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {user.licensePlate ? displayLicensePlate(user.licensePlate) : ''}
                      </span>
                    </div>
                  ) : (
                    user?.licensePlate ? displayLicensePlate(user.licensePlate) : ''
                  )}
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        <Card className="p-5 bg-card border-border shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">剩餘點數</div>
              <div className="text-5xl font-bold text-foreground tabular-nums leading-none">
                {getTotalPoints(user)}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/wallet')}
              className="h-9 px-3 border-border text-foreground hover:bg-muted/50 shadow-none flex items-center gap-1.5"
            >
              <Wallet className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-sm">儲值</span>
            </Button>
          </div>

          {isLowPoints && (
            <div className="mt-4 pt-4 border-t border-border flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground leading-relaxed">
                點數即將用完，建議儲值以繼續使用
              </p>
            </div>
          )}
        </Card>

        <button
          className="w-full px-4 py-5 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => router.push('/send')}
          disabled={isLowPoints && (getTotalPoints(user)) < 1}
        >
          <div className="flex items-center justify-center gap-3">
            <Send className="h-6 w-6" strokeWidth={2} />
            <div className="text-left">
              <div className="text-lg font-medium">發送提醒</div>
              <div className="text-xs opacity-80 mt-0.5">一次性、不開啟聊天</div>
            </div>
          </div>
        </button>

        {user?.userType !== 'pedestrian' && unreadCount > 0 && (
          <Card
            className="p-4 cursor-pointer hover:border-primary/50 transition-colors bg-primary/5 border-primary/30 shadow-none"
            onClick={() => router.push('/inbox')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Inbox className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <div>
                  <p className="text-base font-medium text-foreground">您有新的提醒</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{unreadCount} 則未讀</p>
                </div>
              </div>
              <div className="w-2.5 h-2.5 bg-primary rounded-full" />
            </div>
          </Card>
        )}

        {user?.userType === 'pedestrian' && (
          <Card className="p-4 bg-muted/30 border-border shadow-none">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div className="text-sm space-y-1">
                <p className="text-foreground font-medium">行人用戶模式</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  你可以發送提醒給汽車/機車駕駛<br />
                  但無法收到提醒（因為沒有車牌號碼）
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="px-4 py-3 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            提醒送出後不會開啟聊天<br />
            所有提醒皆為一次性
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-border hover:bg-muted/50 shadow-none relative"
            onClick={() => router.push('/inbox')}
          >
            <Inbox className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm text-foreground">收件箱</span>
            {unreadCount > 0 && (
              <div className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs text-primary-foreground font-medium tabular-nums">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </div>
            )}
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-border hover:bg-muted/50 shadow-none"
            onClick={() => router.push('/sent')}
          >
            <History className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm text-foreground">發送記錄</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-border hover:bg-muted/50 shadow-none"
            onClick={() => router.push('/wallet')}
          >
            <Wallet className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm text-foreground">點數</span>
          </Button>
        </div>

        {/* 邀請好友 */}
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-none">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">邀請好友賺點數</div>
              <div className="text-xs text-primary font-medium">
                你我各得 10 點！
              </div>
            </div>
          </div>

          {isLoadingInvite ? (
            <div className="text-center py-2">
              <div className="text-sm text-muted-foreground">載入中...</div>
            </div>
          ) : inviteData ? (
            <div className="space-y-3">
              <div className="bg-white/80 border border-border rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1 text-center">我的邀請碼</div>
                <div className="text-center font-mono text-xl tracking-[0.5em] text-foreground font-bold">
                  {inviteData.inviteCode}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 bg-white/50"
                  onClick={handleCopyInviteCode}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  複製邀請碼
                </Button>
                <Button
                  className="flex-1 h-10 bg-primary hover:bg-primary-dark"
                  onClick={handleShareInviteCode}
                >
                  <Share2 className="h-4 w-4 mr-1.5" />
                  分享給好友
                </Button>
              </div>

              {inviteData.inviteCount > 0 && (
                <div className="flex items-center justify-center gap-2 pt-2 border-t border-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs text-foreground">
                    已邀請 <span className="font-medium">{inviteData.inviteCount}</span> 人，獲得 <span className="font-medium text-primary">{inviteData.totalRewards}</span> 點
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="text-sm text-muted-foreground">無法載入邀請碼</div>
            </div>
          )}
        </Card>
      </div>

      <BottomNav />
    </div>
  );
});

HomePage.displayName = 'HomePage';

export default HomePage;
