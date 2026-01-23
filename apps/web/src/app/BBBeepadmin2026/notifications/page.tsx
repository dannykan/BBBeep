'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Bell,
  Send,
  Users,
  User,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface NotificationLog {
  id: string;
  type: 'message' | 'broadcast' | 'system';
  title: string;
  body: string;
  targetUserIds: string[];
  successCount: number;
  failureCount: number;
  sentBy: string | null;
  createdAt: string;
}

interface NotificationStats {
  totalDevices: number;
  activeDevices: number;
  iosDevices: number;
  androidDevices: number;
  totalNotifications: number;
  broadcastNotifications: number;
  totalSuccessCount: number;
  totalFailureCount: number;
}

interface SearchUser {
  id: string;
  phone?: string;
  nickname?: string;
  licensePlate?: string;
  lineDisplayName?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Broadcast form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Targeted notification form
  const [targetTitle, setTargetTitle] = useState('');
  const [targetBody, setTargetBody] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSendingTarget, setIsSendingTarget] = useState(false);

  // Stats and logs
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

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
      loadStats();
      loadLogs();
    }
  }, [adminToken]);

  const loadStats = async () => {
    if (!adminToken) return;
    setIsLoadingStats(true);
    try {
      const response = await axios.get(`${API_URL}/admin/notifications/stats`, {
        headers: { 'x-admin-token': adminToken },
      });
      setStats(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/BBBeepadmin2026');
      } else {
        toast.error('載入統計資料失敗');
      }
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadLogs = async () => {
    if (!adminToken) return;
    setIsLoadingLogs(true);
    try {
      const response = await axios.get(`${API_URL}/admin/notifications/logs`, {
        headers: { 'x-admin-token': adminToken },
        params: { limit: 20 },
      });
      setLogs(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/BBBeepadmin2026');
      } else {
        toast.error('載入推播記錄失敗');
      }
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error('請填寫標題和內容');
      return;
    }

    setIsSendingBroadcast(true);
    try {
      const response = await axios.post(
        `${API_URL}/admin/notifications/broadcast`,
        {
          title: broadcastTitle,
          body: broadcastBody,
        },
        {
          headers: { 'x-admin-token': adminToken },
        }
      );
      toast.success(
        `推播發送成功！成功: ${response.data.successCount}, 失敗: ${response.data.failureCount}`
      );
      setBroadcastTitle('');
      setBroadcastBody('');
      loadStats();
      loadLogs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '推播發送失敗');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { 'x-admin-token': adminToken },
        params: { search: searchQuery, limit: 10 },
      });
      setSearchResults(response.data);
    } catch (error: any) {
      toast.error('搜尋用戶失敗');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: SearchUser) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleSendTargeted = async () => {
    if (!targetTitle.trim() || !targetBody.trim()) {
      toast.error('請填寫標題和內容');
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error('請選擇至少一位用戶');
      return;
    }

    setIsSendingTarget(true);
    try {
      const response = await axios.post(
        `${API_URL}/admin/notifications/send`,
        {
          title: targetTitle,
          body: targetBody,
          userIds: selectedUsers.map((u) => u.id),
        },
        {
          headers: { 'x-admin-token': adminToken },
        }
      );
      toast.success(
        `推播發送成功！成功: ${response.data.successCount}, 失敗: ${response.data.failureCount}`
      );
      setTargetTitle('');
      setTargetBody('');
      setSelectedUsers([]);
      loadStats();
      loadLogs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '推播發送失敗');
    } finally {
      setIsSendingTarget(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'broadcast':
        return '全體推播';
      case 'message':
        return '訊息通知';
      case 'system':
        return '系統通知';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserDisplayName = (user: SearchUser) => {
    if (user.nickname) return user.nickname;
    if (user.lineDisplayName) return user.lineDisplayName;
    if (user.phone) return user.phone;
    if (user.licensePlate) return user.licensePlate;
    return user.id.substring(0, 8);
  };

  if (!adminToken) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/BBBeepadmin2026')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">推播通知管理</h1>
            <p className="text-xs text-muted-foreground">發送推播通知給 App 用戶</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">已註冊裝置</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoadingStats ? '...' : stats?.activeDevices || 0}
                </p>
              </div>
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">iOS / Android</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoadingStats
                    ? '...'
                    : `${stats?.iosDevices || 0} / ${stats?.androidDevices || 0}`}
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">全體推播次數</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoadingStats ? '...' : stats?.broadcastNotifications || 0}
                </p>
              </div>
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">成功 / 失敗</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoadingStats
                    ? '...'
                    : `${stats?.totalSuccessCount || 0} / ${stats?.totalFailureCount || 0}`}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Broadcast Notification */}
          <Card className="p-6 bg-card border-border shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">全體推播</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              發送推播通知給所有已註冊裝置的用戶
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="broadcast-title">標題</Label>
                <Input
                  id="broadcast-title"
                  placeholder="輸入推播標題"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="broadcast-body">內容</Label>
                <Textarea
                  id="broadcast-body"
                  placeholder="輸入推播內容"
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSendBroadcast}
                disabled={isSendingBroadcast || !broadcastTitle.trim() || !broadcastBody.trim()}
              >
                {isSendingBroadcast ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    發送中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    發送全體推播
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Targeted Notification */}
          <Card className="p-6 bg-card border-border shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">指定用戶推播</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              發送推播通知給特定用戶
            </p>

            <div className="space-y-4">
              {/* User Search */}
              <div className="space-y-2">
                <Label>選擇用戶</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜尋手機、暱稱或車牌"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchUsers();
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" onClick={handleSearchUsers} disabled={isSearching}>
                    搜尋
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                        onClick={() => handleSelectUser(user)}
                      >
                        <p className="text-sm text-foreground">{getUserDisplayName(user)}</p>
                        {user.licensePlate && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {user.licensePlate}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                      >
                        <span>{getUserDisplayName(user)}</span>
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          className="hover:text-red-500"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-title">標題</Label>
                <Input
                  id="target-title"
                  placeholder="輸入推播標題"
                  value={targetTitle}
                  onChange={(e) => setTargetTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-body">內容</Label>
                <Textarea
                  id="target-body"
                  placeholder="輸入推播內容"
                  value={targetBody}
                  onChange={(e) => setTargetBody(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSendTargeted}
                disabled={
                  isSendingTarget ||
                  !targetTitle.trim() ||
                  !targetBody.trim() ||
                  selectedUsers.length === 0
                }
              >
                {isSendingTarget ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    發送中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    發送指定推播 ({selectedUsers.length} 位用戶)
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Notification Logs */}
        <Card className="p-6 bg-card border-border shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">推播記錄</h2>
            </div>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoadingLogs}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              重新整理
            </Button>
          </div>

          {isLoadingLogs ? (
            <p className="text-center text-muted-foreground py-8">載入中...</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">尚無推播記錄</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 border border-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary mr-2">
                        {getTypeLabel(log.type)}
                      </span>
                      <span className="text-sm font-medium text-foreground">{log.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{log.body}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {log.targetUserIds.length > 0 ? (
                      <span>目標用戶: {log.targetUserIds.length} 人</span>
                    ) : (
                      <span>全體用戶</span>
                    )}
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      成功: {log.successCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      失敗: {log.failureCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
