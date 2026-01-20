'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, TrendingUp, TrendingDown, Gift, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/layout/BottomNav';
import { pointsApi } from '@/lib/api-services';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { PointHistory } from '@/types';

const RECHARGE_OPTIONS = [
  { points: 10, price: 30, popular: false },
  { points: 30, price: 80, popular: true },
  { points: 50, price: 120, popular: false },
  { points: 100, price: 200, popular: false },
];

const WalletPage = React.memo(() => {
  const router = useRouter();
  const { user, pointHistory, refreshUser, refreshPointHistory } = useApp();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRecharging, setIsRecharging] = useState(false);

  useEffect(() => {
    if (user) {
      refreshPointHistory();
    }
  }, [user, refreshPointHistory]);

  const handleRecharge = async (points: number, price: number) => {
    if (!user) return;

    setIsRecharging(true);
    try {
      await pointsApi.recharge(points);
      await refreshUser();
      await refreshPointHistory();
      toast.success('儲值成功', {
        description: `已獲得 ${points} 點`,
      });
      setSelectedOption(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '儲值失敗');
    } finally {
      setIsRecharging(false);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: zhTW,
      });
    } catch (e) {
      return '未知時間';
    }
  };

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'spend':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'earn':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'bonus':
        return <Gift className="h-4 w-4 text-primary" />;
      default:
        return null;
    }
  };

  const getHistoryColor = (type: string, amount: number) => {
    if (amount > 0) {
      return 'text-green-600';
    }
    return 'text-red-600';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between relative">
          <button
            onClick={() => router.push('/home')}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">點數</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* 当前点数 */}
        <Card className="p-6 text-center bg-card border-border shadow-none">
          <div className="text-xs text-muted-foreground mb-2">目前剩餘</div>
          <div className="text-6xl font-bold text-primary-dark tabular-nums mb-1">
            {user.points || 0}
          </div>
          <div className="text-sm text-muted-foreground">點</div>
        </Card>

        {/* 储值方案 */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">儲值方案</div>
          <div className="space-y-2">
            {RECHARGE_OPTIONS.map((option) => (
              <Card
                key={option.points}
                className={`p-4 bg-card shadow-none cursor-pointer transition-all ${
                  selectedOption === option.points
                    ? 'border-primary border-2 bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${option.popular ? 'border-primary/50' : ''}`}
                onClick={() => setSelectedOption(option.points)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl text-foreground tabular-nums font-medium">
                        {option.points}
                      </span>
                      <span className="text-sm text-muted-foreground">點</span>
                      {option.popular && (
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                          推薦
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                      NT$ {option.price}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>尚未開通</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 点数记录 */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">點數紀錄</div>
          <Card className="divide-y divide-border bg-card border-border shadow-none overflow-hidden">
            {pointHistory.length > 0 ? (
              <>
                {pointHistory.slice(0, 10).map((history: PointHistory) => (
                  <div key={history.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getHistoryIcon(history.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground mb-0.5 truncate">
                            {history.description}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatTime(history.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-base font-medium tabular-nums ${getHistoryColor(
                          history.type,
                          history.amount,
                        )}`}
                      >
                        {history.amount > 0 ? '+' : ''}
                        {history.amount}
                      </span>
                    </div>
                  </div>
                ))}
                {pointHistory.length > 10 && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      還有 {pointHistory.length - 10} 筆記錄
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">暫無紀錄</p>
              </div>
            )}
          </Card>
        </div>

        {/* 说明 */}
        <Card className="p-4 bg-muted/30 border-border shadow-none">
          <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
            <div className="flex items-center justify-between">
              <span className="text-foreground">車況提醒</span>
              <span className="text-foreground">1 點</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">行車安全提醒（模板）</span>
              <span className="text-foreground">1 點</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">行車安全提醒（補充文字）</span>
              <span className="text-foreground">4 點</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">AI 協助改寫</span>
              <span className="text-foreground">+1 點</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">讚美感謝</span>
              <span className="text-green-600">免費</span>
            </div>
            <div className="pt-2 mt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-foreground">收到讚美回饋</span>
                <span className="text-green-600">+1 點</span>
              </div>
            </div>
            <div className="pt-2 mt-1 border-t border-border/50">
              <p className="text-foreground">點數永久有效</p>
            </div>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
});

WalletPage.displayName = 'WalletPage';

export default WalletPage;
