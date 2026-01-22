'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Gift, Users, Settings, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { adminInviteApi } from '@/lib/api-services';
import type { InviteSettings, InviteStatistics, AdminInviteHistoryItem, InviteStatus } from '@/types';

const InviteSettingsPage = React.memo(() => {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState<InviteSettings | null>(null);
  const [statistics, setStatistics] = useState<InviteStatistics | null>(null);
  const [history, setHistory] = useState<AdminInviteHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<InviteStatus | 'all'>('all');

  // Form state
  const [defaultInviterReward, setDefaultInviterReward] = useState<number>(5);
  const [defaultInviteeReward, setDefaultInviteeReward] = useState<number>(3);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (!savedToken) {
      router.push('/BBBeepadmin2026');
      return;
    }
    setAdminToken(savedToken);
  }, [router]);

  useEffect(() => {
    if (adminToken) {
      loadData();
    }
  }, [adminToken]);

  useEffect(() => {
    if (adminToken) {
      loadHistory();
    }
  }, [adminToken, historyFilter]);

  const loadData = async () => {
    if (!adminToken) return;

    setIsLoading(true);
    try {
      const [settingsData, statsData] = await Promise.all([
        adminInviteApi.getSettings(adminToken),
        adminInviteApi.getStatistics(adminToken),
      ]);

      setSettings(settingsData);
      setStatistics(statsData);

      // Update form state
      setDefaultInviterReward(settingsData.defaultInviterReward);
      setDefaultInviteeReward(settingsData.defaultInviteeReward);
      setIsEnabled(settingsData.isEnabled);
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        router.push('/BBBeepadmin2026');
        toast.error('登入已過期，請重新登入');
      } else {
        toast.error('載入資料失敗');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!adminToken) return;

    try {
      const status = historyFilter === 'all' ? undefined : historyFilter;
      const data = await adminInviteApi.getHistory(adminToken, status);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!adminToken) return;

    setIsSaving(true);
    try {
      await adminInviteApi.updateSettings(adminToken, {
        defaultInviterReward,
        defaultInviteeReward,
        isEnabled,
      });
      toast.success('設定已儲存');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '儲存設定失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: InviteStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3" />
            已完成
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3" />
            待完成
          </span>
        );
      case 'expired':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
            <XCircle className="h-3 w-3" />
            已過期
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/BBBeepadmin2026')}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-base text-foreground">邀請碼設定</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">載入中...</p>
          </div>
        ) : (
          <>
            {/* 統計卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-card border-border shadow-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">總邀請數</p>
                    <p className="text-xl font-bold text-foreground">{statistics?.totalInvites || 0}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border-border shadow-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">已完成</p>
                    <p className="text-xl font-bold text-foreground">{statistics?.completedInvites || 0}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border-border shadow-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">待完成</p>
                    <p className="text-xl font-bold text-foreground">{statistics?.pendingInvites || 0}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border-border shadow-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Gift className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">已發放獎勵</p>
                    <p className="text-xl font-bold text-foreground">{statistics?.totalRewardsDistributed || 0}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* 全域設定 */}
            <Card className="p-6 bg-card border-border shadow-none">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-foreground">全域設定</h2>
                  <p className="text-xs text-muted-foreground">設定邀請系統的預設獎勵</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">啟用邀請系統</p>
                    <p className="text-xs text-muted-foreground">關閉後，用戶將無法使用邀請碼</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() => setIsEnabled(!isEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      isEnabled ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviterReward">邀請人獎勵點數</Label>
                    <Input
                      id="inviterReward"
                      type="number"
                      min={0}
                      max={100}
                      value={defaultInviterReward}
                      onChange={(e) => setDefaultInviterReward(parseInt(e.target.value) || 0)}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">每次成功邀請後，邀請人獲得的點數</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteeReward">被邀請人獎勵點數</Label>
                    <Input
                      id="inviteeReward"
                      type="number"
                      min={0}
                      max={100}
                      value={defaultInviteeReward}
                      onChange={(e) => setDefaultInviteeReward(parseInt(e.target.value) || 0)}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">被邀請人完成註冊後獲得的點數</p>
                  </div>
                </div>

                <Button
                  className="w-full h-11 bg-primary hover:bg-primary-dark"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                >
                  {isSaving ? '儲存中...' : '儲存設定'}
                </Button>
              </div>
            </Card>

            {/* 邀請記錄 */}
            <Card className="p-6 bg-card border-border shadow-none">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-foreground">邀請記錄</h2>
                <div className="flex gap-2">
                  <Button
                    variant={historyFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHistoryFilter('all')}
                  >
                    全部
                  </Button>
                  <Button
                    variant={historyFilter === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHistoryFilter('completed')}
                  >
                    已完成
                  </Button>
                  <Button
                    variant={historyFilter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHistoryFilter('pending')}
                  >
                    待完成
                  </Button>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">暫無邀請記錄</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {item.inviter.nickname || item.inviter.phone || '匿名用戶'}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-sm font-medium text-foreground">
                              {item.invitee.nickname || item.invitee.phone || '匿名用戶'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            邀請碼：{item.inviteCode}
                          </p>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          獎勵：邀請人 +{item.inviterReward} / 被邀請人 +{item.inviteeReward}
                        </span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
});

InviteSettingsPage.displayName = 'InviteSettingsPage';

export default InviteSettingsPage;
