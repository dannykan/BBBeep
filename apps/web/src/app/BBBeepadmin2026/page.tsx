'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Car, Bike, User, Lock, Search, ChevronRight, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const ADMIN_PASSWORD = '12345678';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AdminUser {
  id: string;
  phone?: string;
  nickname?: string;
  licensePlate?: string;
  userType: 'driver' | 'pedestrian';
  vehicleType?: 'car' | 'scooter';
  points: number;
  freePoints?: number;
  trialPoints?: number;
  hasCompletedOnboarding: boolean;
  createdAt: string;
  // LINE Login 相關
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  // 封鎖狀態
  isBlockedByAdmin?: boolean;
  _count: {
    receivedMessages: number;
    sentMessages: number;
  };
}

const AdminPage = React.memo(() => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<'driver' | 'pedestrian' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 检查本地存储的 token
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && adminToken) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserType, isAuthenticated, adminToken]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const handleLogin = async () => {
    if (password !== ADMIN_PASSWORD) {
      toast.error('密碼錯誤');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/admin/login`, { password });
      const token = response.data.token;
      localStorage.setItem('admin_token', token);
      setAdminToken(token);
      setIsAuthenticated(true);
      toast.success('登入成功');
      // loadUsers 会在 adminToken 设置后通过 useEffect 自动调用
    } catch (error: any) {
      toast.error(error.response?.data?.message || '登入失敗');
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setPassword('');
    toast.success('已登出');
  };

  const loadUsers = async () => {
    if (!adminToken) {
      console.log('No admin token available');
      return;
    }

    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedUserType !== 'all') {
        params.userType = selectedUserType;
      }

      console.log('Loading users with token:', adminToken.substring(0, 20) + '...');
      const response = await axios.get(`${API_URL}/admin/users`, {
        params,
        headers: {
          'x-admin-token': adminToken,
        },
      });
      // 確保 response.data 是陣列
      const usersData = Array.isArray(response.data) ? response.data : [];
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error: any) {
      console.error('Load users error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        handleLogout();
        toast.error('登入已過期，請重新登入');
      } else {
        toast.error(error.response?.data?.message || '載入用戶失敗');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.phone?.toLowerCase().includes(query) ||
        user.nickname?.toLowerCase().includes(query) ||
        user.licensePlate?.toLowerCase().includes(query) ||
        user.lineDisplayName?.toLowerCase().includes(query) ||
        user.lineUserId?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case 'driver':
        return '駕駛';
      case 'pedestrian':
        return '行人';
      default:
        return userType;
    }
  };

  const getUserTypeIcon = (userType: string, vehicleType?: string) => {
    if (userType === 'pedestrian') {
      return <User className="h-4 w-4" />;
    }
    return vehicleType === 'car' ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">管理員登入</h1>
            <p className="text-sm text-muted-foreground">請輸入管理員密碼</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin();
                  }
                }}
                className="h-11"
              />
            </div>

            <Button
              className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
              onClick={handleLogin}
              disabled={!password}
            >
              登入
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const driverUsers = filteredUsers.filter((u) => u.userType === 'driver');
  const pedestrianUsers = filteredUsers.filter((u) => u.userType === 'pedestrian');
  const carUsers = driverUsers.filter((u) => u.vehicleType === 'car');
  const scooterUsers = driverUsers.filter((u) => u.vehicleType === 'scooter');

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">管理後台</h1>
            <p className="text-xs text-muted-foreground">用戶管理系統</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/BBBeepadmin2026/applications')}
            >
              申請審核
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/BBBeepadmin2026/license-plates')}
            >
              車牌管理
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/BBBeepadmin2026/reports')}
            >
              檢舉管理
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/BBBeepadmin2026/ai-prompts')}
            >
              AI Prompt 管理
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/BBBeepadmin2026/invite-settings')}
            >
              邀請碼設定
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/BBBeepadmin2026/notifications')}
            >
              推播管理
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/BBBeepadmin2026/app-content')}
            >
              應用程式內容
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">總用戶數</p>
                <p className="text-2xl font-bold text-foreground">{filteredUsers.length}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">汽車駕駛</p>
                <p className="text-2xl font-bold text-foreground">{carUsers.length}</p>
              </div>
              <Car className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">機車騎士</p>
                <p className="text-2xl font-bold text-foreground">{scooterUsers.length}</p>
              </div>
              <Bike className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">行人用戶</p>
                <p className="text-2xl font-bold text-foreground">{pedestrianUsers.length}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* 篩選和搜索 */}
        <Card className="p-4 bg-card border-border shadow-none">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索手機號碼、暱稱或車牌..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedUserType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedUserType('all')}
              >
                全部
              </Button>
              <Button
                variant={selectedUserType === 'driver' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedUserType('driver')}
              >
                駕駛
              </Button>
              <Button
                variant={selectedUserType === 'pedestrian' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedUserType('pedestrian')}
              >
                行人
              </Button>
            </div>
          </div>
        </Card>

        {/* 用戶列表 */}
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">載入中...</p>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">沒有找到用戶</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="p-4 bg-card border-border shadow-none hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/BBBeepadmin2026/user?id=${user.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getUserTypeIcon(user.userType, user.vehicleType)}
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {getUserTypeLabel(user.userType)}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  {/* LINE 用戶顯示 */}
                  {user.lineUserId ? (
                    <div className="flex items-center gap-2">
                      {user.linePictureUrl && (
                        <img
                          src={user.linePictureUrl}
                          alt="LINE"
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <p className="text-xs text-green-600">LINE 用戶</p>
                        <p className="text-sm font-medium text-foreground">{user.lineDisplayName || 'LINE 用戶'}</p>
                      </div>
                    </div>
                  ) : user.phone ? (
                    <div>
                      <p className="text-xs text-muted-foreground">手機號碼</p>
                      <p className="text-sm font-medium text-foreground">{user.phone}</p>
                    </div>
                  ) : null}

                  {/* 封鎖狀態 */}
                  {user.isBlockedByAdmin && (
                    <div className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600">
                      已封鎖
                    </div>
                  )}

                  {/* 暱稱 - 顯示 LINE 顯示名稱以外的自訂暱稱 */}
                  {user.nickname && user.nickname !== user.lineDisplayName && (
                    <div>
                      <p className="text-xs text-muted-foreground">暱稱</p>
                      <p className="text-sm text-foreground">{user.nickname}</p>
                    </div>
                  )}

                  {user.licensePlate && (
                    <div>
                      <p className="text-xs text-muted-foreground">車牌</p>
                      <p className="text-sm font-mono text-foreground">{user.licensePlate}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">點數</p>
                      <p className="text-sm font-medium text-foreground">{(user.trialPoints || 0) + (user.freePoints || 0) + (user.points || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">消息</p>
                      <p className="text-sm text-foreground">
                        收 {user._count.receivedMessages} / 發 {user._count.sentMessages}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

AdminPage.displayName = 'AdminPage';

export default AdminPage;
