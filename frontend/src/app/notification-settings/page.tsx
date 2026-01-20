'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Mail, Check, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api-services';

const NotificationSettingsPage = React.memo(() => {
  const router = useRouter();
  const { user, refreshUser } = useApp();
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!email.trim()) {
      toast.error('請輸入電子郵件');
      return;
    }

    // 简单的邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('請輸入有效的電子郵件地址');
      return;
    }

    setIsSaving(true);
    try {
      await usersApi.updateMe({ email: email.trim() });
      await refreshUser();
      toast.success('通知設定已儲存');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEmail = async () => {
    if (!confirm('確定要移除電子郵件嗎？您將不會收到任何通知。')) {
      return;
    }

    setIsSaving(true);
    try {
      await usersApi.updateMe({ email: undefined });
      setEmail('');
      await refreshUser();
      toast.success('已移除電子郵件');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '移除失敗');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  const hasEmail = !!user.email;

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
          <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">通知設定</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* 說明 */}
        <Card className="p-4 bg-muted/30 border-border shadow-none">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              綁定電子郵件後，您將收到重要提醒的通知。我們不會將您的郵件地址用於其他用途。
            </p>
          </div>
        </Card>

        {/* 邮箱输入 */}
        <Card className="p-6 space-y-4 bg-card border-border shadow-none">
          <div className="space-y-3">
            <Label htmlFor="email" className="text-sm text-foreground flex items-center gap-2">
              電子郵件
              {hasEmail && (
                <span className="text-xs text-primary flex items-center gap-1">
                  <Check className="h-3 w-3" strokeWidth={1.5} />
                  已綁定
                </span>
              )}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-input-background border-border"
            />
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 h-11 bg-primary hover:bg-primary-dark text-white shadow-none"
              onClick={handleSave}
              disabled={isSaving || email === user.email}
            >
              {isSaving ? '儲存中...' : '儲存'}
            </Button>

            {hasEmail && (
              <Button
                variant="outline"
                className="h-11 px-4 border-border hover:bg-destructive hover:text-destructive-foreground shadow-none"
                onClick={handleRemoveEmail}
                disabled={isSaving}
              >
                移除
              </Button>
            )}
          </div>
        </Card>

        {/* 通知偏好 */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">通知偏好</div>
          <Card className="divide-y divide-border bg-card border-border shadow-none overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {hasEmail ? (
                    <Bell className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  )}
                  <div>
                    <p className="text-sm text-foreground">新提醒通知</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      收到新提醒時發送郵件
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {hasEmail ? '已啟用' : '未設定'}
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {hasEmail ? (
                    <Bell className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  )}
                  <div>
                    <p className="text-sm text-foreground">點數提醒</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      點數不足時發送提醒
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {hasEmail ? '已啟用' : '未設定'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
});

NotificationSettingsPage.displayName = 'NotificationSettingsPage';

export default NotificationSettingsPage;
