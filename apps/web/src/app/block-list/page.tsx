'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, X, Ban, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api-services';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const BlockListPage = React.memo(() => {
  const router = useRouter();
  const { user, refreshUser } = useApp();
  const [showUnblockDialog, setShowUnblockDialog] = React.useState(false);
  const [showUnrejectDialog, setShowUnrejectDialog] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<{
    id: string;
    nickname?: string;
    type: 'blocked' | 'rejected';
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    if (user) {
      refreshUser();
    }
  }, [user, refreshUser]);

  const handleUnblock = async () => {
    if (!selectedUser) return;

    setIsLoading(true);
    try {
      await usersApi.unblockUser(selectedUser.id);
      await refreshUser();
      setShowUnblockDialog(false);
      setSelectedUser(null);
      toast.success('已解除封鎖');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '解除封鎖失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnreject = async () => {
    if (!selectedUser) return;

    setIsLoading(true);
    try {
      await usersApi.unrejectUser(selectedUser.id);
      await refreshUser();
      setShowUnrejectDialog(false);
      setSelectedUser(null);
      toast.success('已從拒收名單移除');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '移除失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const openUnblockDialog = (user: { id: string; nickname?: string }) => {
    setSelectedUser({ ...user, type: 'blocked' });
    setShowUnblockDialog(true);
  };

  const openUnrejectDialog = (user: { id: string; nickname?: string }) => {
    setSelectedUser({ ...user, type: 'rejected' });
    setShowUnrejectDialog(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  const blockedUsers = user.blockedUsers || [];
  const rejectedUsers = user.rejectedUsers || [];

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
          <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">封鎖 / 拒收</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* 說明 */}
        <Card className="p-4 bg-muted/30 border-border shadow-none">
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              <span className="font-medium text-foreground">封鎖：</span>
              完全隔絕往來，您無法發送也無法接收該用戶的提醒
            </p>
            <p>
              <span className="font-medium text-foreground">拒收：</span>
              只是不接收該用戶的提醒，但您仍可向對方發送提醒
            </p>
            <p className="mt-3 pt-3 border-t border-border">
              💡 只能從收件夾的訊息中封鎖/拒收發送者
            </p>
          </div>
        </Card>

        {/* 封鎖名單 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Ban className="h-4 w-4" strokeWidth={1.5} />
              封鎖名單
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {blockedUsers.length} 位用戶
            </div>
          </div>

          {blockedUsers.length > 0 ? (
            <Card className="divide-y divide-border bg-card border-border shadow-none overflow-hidden">
              {blockedUsers.map((blockedUser) => (
                <div
                  key={blockedUser.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="text-sm text-foreground">
                    {blockedUser.blocked?.nickname || '匿名用戶'}
                  </div>
                  <button
                    onClick={() =>
                      openUnblockDialog({
                        id: blockedUser.blocked.id,
                        nickname: blockedUser.blocked.nickname,
                      })
                    }
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                    <span>解除</span>
                  </button>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-8 text-center bg-card border-border shadow-none">
              <Ban className="h-8 w-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">尚無封鎖用戶</p>
              <p className="text-xs text-muted-foreground mt-2">
                從收件夾的訊息中可以封鎖發送者
              </p>
            </Card>
          )}
        </div>

        {/* 拒收名單 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4" strokeWidth={1.5} />
              拒收名單
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {rejectedUsers.length} 位用戶
            </div>
          </div>

          {rejectedUsers.length > 0 ? (
            <Card className="divide-y divide-border bg-card border-border shadow-none overflow-hidden">
              {rejectedUsers.map((rejectedUser) => (
                <div
                  key={rejectedUser.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="text-sm text-foreground">
                    {rejectedUser.rejected?.nickname || '匿名用戶'}
                  </div>
                  <button
                    onClick={() =>
                      openUnrejectDialog({
                        id: rejectedUser.rejected.id,
                        nickname: rejectedUser.rejected.nickname,
                      })
                    }
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                    <span>移除</span>
                  </button>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="p-8 text-center bg-card border-border shadow-none">
              <UserX className="h-8 w-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">尚無拒收用戶</p>
              <p className="text-xs text-muted-foreground mt-2">
                從收件夾的訊息中可以拒收發送者
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* 解除封鎖確認對話框 */}
      <Dialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>解除封鎖</DialogTitle>
            <DialogDescription>
              確定要解除封鎖「{selectedUser?.nickname || '匿名用戶'}」嗎？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnblockDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUnblock} disabled={isLoading}>
              {isLoading ? '處理中...' : '確認解除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移除拒收確認對話框 */}
      <Dialog open={showUnrejectDialog} onOpenChange={setShowUnrejectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>移除拒收</DialogTitle>
            <DialogDescription>
              確定要從拒收名單移除「{selectedUser?.nickname || '匿名用戶'}」嗎？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnrejectDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUnreject} disabled={isLoading}>
              {isLoading ? '處理中...' : '確認移除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

BlockListPage.displayName = 'BlockListPage';

export default BlockListPage;
