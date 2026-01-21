'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Bell,
  Ban,
  FileText,
  Shield,
  LogOut,
  Car,
  Bike,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/layout/BottomNav';
import { usersApi } from '@/lib/api-services';
import { displayLicensePlate } from '@/lib/license-plate-format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SettingsPage = React.memo(() => {
  const router = useRouter();
  const { user, logout, refreshUser } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showLicensePlateDialog, setShowLicensePlateDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateNickname = async () => {
    if (!nickname.trim()) {
      toast.error('暱稱不能為空');
      return;
    }
    if (nickname.length > 12) {
      toast.error('暱稱最多12字');
      return;
    }

    setIsLoading(true);
    try {
      await usersApi.updateMe({ nickname: nickname.trim() });
      await refreshUser();
      setShowNicknameDialog(false);
      toast.success('暱稱已更新');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('請輸入有效的電子郵件地址');
      return;
    }

    setIsLoading(true);
    try {
      await usersApi.updateMe({ email: email.trim() || undefined });
      await refreshUser();
      setShowEmailDialog(false);
      toast.success('電子郵件已更新');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/landing');
    toast.success('已登出');
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
          <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">設定</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* 用户信息 */}
        <Card className="p-4 bg-card border-border shadow-none">
          <div className="space-y-3">
            {/* 昵称 */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">暱稱</div>
                  <div className="text-sm text-foreground">
                    {user.nickname || '未設定'}
                  </div>
                </div>
                <button
                  onClick={() => setShowNicknameDialog(true)}
                  className="p-1.5 hover:bg-muted/50 rounded transition-colors"
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* 电子邮箱 */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">電子郵件</div>
                  <div className="text-sm text-foreground">
                    {user.email || '未設定'}
                  </div>
                </div>
                <button
                  onClick={() => setShowEmailDialog(true)}
                  className="p-1.5 hover:bg-muted/50 rounded transition-colors"
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* 车牌号码（仅驾驶用户） */}
            {user.userType !== 'pedestrian' && user.licensePlate && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">車牌號碼</div>
                    <div className="text-sm text-foreground font-mono">
                      {user.licensePlate ? displayLicensePlate(user.licensePlate) : '未設定'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {user.vehicleType === 'car' ? (
                      <Car className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Bike className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 用户类型（行人） */}
            {user.userType === 'pedestrian' && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">用戶類型</div>
                    <div className="text-sm text-foreground flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      行人用戶
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 其他设置 */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">其他</div>
          <Card className="divide-y divide-border bg-card border-border shadow-none overflow-hidden">
            <button
              onClick={() => router.push('/notification-settings')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-sm text-foreground">通知設定</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            </button>

            <button
              onClick={() => router.push('/block-list')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Ban className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-sm text-foreground">封鎖 / 拒收</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            </button>

            <button
              onClick={() => router.push('/terms')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-sm text-foreground">使用條款</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            </button>

            <button
              onClick={() => router.push('/privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-sm text-foreground">隱私權政策</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            </button>
          </Card>
        </div>

        {/* 账户操作 */}
        <div className="space-y-2 pt-6">
          <Button
            variant="outline"
            className="w-full h-11 border-border hover:bg-muted/50 shadow-none"
            onClick={() => setShowLogoutDialog(true)}
          >
            <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} />
            登出
          </Button>
        </div>

        {/* 版本信息 */}
        <p className="text-center text-xs text-muted-foreground">版本 1.0.0</p>
      </div>

      <BottomNav />

      {/* 编辑昵称对话框 */}
      <Dialog open={showNicknameDialog} onOpenChange={setShowNicknameDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>編輯暱稱</DialogTitle>
            <DialogDescription>暱稱將用於顯示，可隨時修改</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">暱稱</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="輸入您的暱稱"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                className="h-11 bg-input-background border-border"
              />
              <p className="text-xs text-muted-foreground text-right">
                {nickname.length} / 12 字
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNicknameDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateNickname} disabled={isLoading || !nickname.trim()}>
              {isLoading ? '更新中...' : '確認'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑邮箱对话框 */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>編輯電子郵件</DialogTitle>
            <DialogDescription>用於接收通知，可選填</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                placeholder="輸入您的電子郵件"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-input-background border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateEmail} disabled={isLoading}>
              {isLoading ? '更新中...' : '確認'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 登出确认对话框 */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>確認登出</DialogTitle>
            <DialogDescription>確定要登出嗎？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              取消
            </Button>
            <Button onClick={handleLogout}>確認登出</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
});

SettingsPage.displayName = 'SettingsPage';

export default SettingsPage;
