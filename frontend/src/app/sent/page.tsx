'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/layout/BottomNav';
import { formatDistanceToNow } from 'date-fns';
import { messagesApi } from '@/lib/api-services';
import type { SentMessage } from '@/types';
import { displayLicensePlate } from '@/lib/license-plate-format';

const SentPage = React.memo(() => {
  const router = useRouter();
  const { user } = useApp();
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadSentMessages();
  }, [user, router]);

  const loadSentMessages = async () => {
    try {
      setIsLoading(true);
      const messages = await messagesApi.getSent();
      setSentMessages(messages);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '載入發送記錄失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMsg = sentMessages.find((m) => m.id === selectedMessage);

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
      });
    } catch {
      return '未知時間';
    }
  };

  const getMessageAccentColor = (type: string) => {
    switch (type) {
      case '車況提醒':
        return 'border-l-[3px] border-l-accent-vehicle';
      case '行車安全提醒':
        return 'border-l-[3px] border-l-accent-safety';
      case '讚美感謝':
        return 'border-l-[3px] border-l-accent-praise';
      default:
        return '';
    }
  };

  const getTagColor = (type: string) => {
    switch (type) {
      case '車況提醒':
        return 'bg-accent-vehicle/10 text-accent-vehicle';
      case '行車安全提醒':
        return 'bg-accent-safety/10 text-accent-safety';
      case '讚美感謝':
        return 'bg-accent-praise/10 text-accent-praise';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!user) return null;

  if (selectedMessage && selectedMsg) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="max-w-md mx-auto px-6 py-4 flex items-center gap-4">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                  <span className="text-sm text-muted-foreground">返回</span>
                </button>
            <h1 className="text-base text-foreground">發送詳情</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className={`inline-block px-2.5 py-1 rounded-md text-xs ${getTagColor(selectedMsg.type)}`}>
              {selectedMsg.type}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(selectedMsg.createdAt)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${selectedMsg.read ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'}`}>
              {selectedMsg.read ? '✓ 已讀' : '未讀'}
            </span>
          </div>

          <Card className="p-5 space-y-4 bg-card border-border shadow-none">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-base text-foreground leading-relaxed">{selectedMsg.template}</p>
            </div>

            {selectedMsg.customText && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">補充說明</p>
                <p className="text-base text-foreground leading-relaxed">{selectedMsg.customText}</p>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">發送給</p>
              <p className="text-sm text-foreground mt-1">
                {selectedMsg.receiver.licensePlate ? displayLicensePlate(selectedMsg.receiver.licensePlate) : '未知車牌'}
                {selectedMsg.receiver.nickname && ` (${selectedMsg.receiver.nickname})`}
              </p>
            </div>
          </Card>

          <div className="space-y-2">
            <button
              onClick={() => setSelectedMessage(null)}
              className="w-full h-11 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
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
              <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">發送記錄</h1>
              <div className="w-[80px]" />
            </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-4">
        {isLoading ? (
          <Card className="p-8 text-center space-y-4">
            <p className="text-foreground">載入中...</p>
          </Card>
        ) : sentMessages.length === 0 ? (
          <Card className="p-8 text-center space-y-4">
            <p className="text-foreground">尚無發送記錄</p>
            <p className="text-sm text-muted-foreground">當您發送提醒時，會顯示在這裡</p>
            <Button
              className="w-full bg-primary hover:bg-primary-dark text-white"
              onClick={() => router.push('/send')}
            >
              發送提醒
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {sentMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => setSelectedMessage(message.id)}
                className={`w-full p-4 text-left hover:bg-muted/30 transition-colors bg-card border border-border rounded-lg ${getMessageAccentColor(message.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${getTagColor(message.type)}`}>
                        {message.type}
                      </span>
                      {message.read && (
                        <span className="text-xs text-muted-foreground">已讀</span>
                      )}
                      <span className="text-xs text-muted-foreground tabular-nums ml-auto">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-base text-foreground line-clamp-1 mb-1 font-medium">
                      {message.template}
                    </p>
                    {message.customText && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {message.customText}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      發送給：{message.receiver.licensePlate ? displayLicensePlate(message.receiver.licensePlate) : '未知車牌'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" strokeWidth={1.5} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
});

SentPage.displayName = 'SentPage';

export default SentPage;
