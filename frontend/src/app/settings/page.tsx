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
  Ban,
  FileText,
  Shield,
  LogOut,
  Car,
  Bike,
  User as UserIcon,
  MessageCircle,
  ExternalLink,
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

// LINE Official Account ID
const LINE_OA_ID = '@556vmzwz';
const LINE_OA_URL = `https://line.me/R/ti/p/${LINE_OA_ID}`;

const SettingsPage = React.memo(() => {
  const router = useRouter();
  const { user, logout, refreshUser } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
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

  const handleAddLineFriend = () => {
    window.open(LINE_OA_URL, '_blank');
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

        {/* LINE 官方帳號 */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">推播通知</div>
          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#00B900]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-[#00B900]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground mb-1">LINE 官方帳號</div>
                <p className="text-xs text-muted-foreground mb-3">
                  加入好友即可接收新訊息通知、系統公告等推播訊息
                </p>
                <Button
                  className="w-full h-10 bg-[#00B900] hover:bg-[#00a000] text-white"
                  onClick={handleAddLineFriend}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  加入 LINE 官方帳號
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-70" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* 其他设置 */}
        <div>
          <div className="text-sm text-muted-foreground mb-3">其他</div>
          <Card className="divide-y divide-border bg-card border-border shadow-none overflow-hidden">
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
