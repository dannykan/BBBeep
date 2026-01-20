'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Edit, Save, X, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UserDetail {
  id: string;
  phone: string;
  nickname?: string;
  licensePlate?: string;
  userType: 'driver' | 'pedestrian';
  vehicleType?: 'car' | 'scooter';
  points: number;
  hasCompletedOnboarding: boolean;
  email?: string;
  createdAt: string;
  _count: {
    receivedMessages: number;
    sentMessages: number;
    pointHistory: number;
  };
}

interface Message {
  id: string;
  type: string;
  template: string;
  customText?: string;
  read: boolean;
  createdAt: string;
  sender?: {
    id: string;
    nickname?: string;
  };
  receiver?: {
    id: string;
    nickname?: string;
  };
}

interface UserDetailClientProps {
  userId: string;
}

const UserDetailClient: React.FC<UserDetailClientProps> = ({ userId }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    nickname: '',
    email: '',
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const getAdminToken = () => {
    return localStorage.getItem('admin_token');
  };

  const loadUserData = async () => {
    const token = getAdminToken();
    if (!token) {
      router.push('/BBBeepadmin2026');
      return;
    }

    setIsLoading(true);
    try {
      const [userResponse, messagesResponse] = await Promise.all([
        axios.get(`${API_URL}/admin/users/${userId}`, {
          headers: { 'x-admin-token': token },
        }),
        axios.get(`${API_URL}/admin/users/${userId}/messages?type=${activeTab}`, {
          headers: { 'x-admin-token': token },
        }),
      ]);

      setUser(userResponse.data);
      setMessages(messagesResponse.data);
      setEditData({
        nickname: userResponse.data.nickname || '',
        email: userResponse.data.email || '',
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/BBBeepadmin2026');
        toast.error('登入已過期');
      } else {
        toast.error('載入用戶資料失敗');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const token = getAdminToken();
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/admin/users/${user.id}`,
        {
          nickname: editData.nickname || undefined,
          email: editData.email || undefined,
        },
        {
          headers: { 'x-admin-token': token },
        }
      );
      toast.success('更新成功');
      setIsEditing(false);
      loadUserData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新失敗');
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    const token = getAdminToken();
    if (!token) return;

    try {
      await axios.delete(`${API_URL}/admin/users/${user.id}`, {
        headers: { 'x-admin-token': token },
      });
      toast.success('用戶已刪除');
      router.push('/BBBeepadmin2026');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '刪除失敗');
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'received' | 'sent');
    loadUserData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">用戶不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative">
          <button
            onClick={() => router.push('/BBBeepadmin2026')}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-lg font-bold text-foreground absolute left-1/2 -translate-x-1/2">用戶詳情</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Card className="p-6 bg-card border-border shadow-none">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">基本資訊</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <span className="ml-2 text-foreground font-mono">{user.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">手機號碼:</span>
                  <span className="ml-2 text-foreground">{user.phone}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    取消
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    儲存
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    編輯
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    刪除
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>暱稱</Label>
              {isEditing ? (
                <Input
                  value={editData.nickname}
                  onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
                  placeholder="未設定"
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground mt-1">{user.nickname || '未設定'}</p>
              )}
            </div>

            <div>
              <Label>電子郵件</Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="未設定"
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground mt-1">{user.email || '未設定'}</p>
              )}
            </div>

            <div>
              <Label>車牌號碼</Label>
              <p className="text-foreground mt-1 font-mono">{user.licensePlate || '未設定'}</p>
            </div>

            <div>
              <Label>用戶類型</Label>
              <p className="text-foreground mt-1">
                {user.userType === 'driver' ? '駕駛' : '行人'}
                {user.vehicleType && ` (${user.vehicleType === 'car' ? '汽車' : '機車'})`}
              </p>
            </div>

            <div>
              <Label>點數</Label>
              <p className="text-foreground mt-1">{user.points}</p>
            </div>

            <div>
              <Label>完成註冊</Label>
              <p className="text-foreground mt-1">{user.hasCompletedOnboarding ? '是' : '否'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border shadow-none">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="received">收到的訊息 ({user._count.receivedMessages})</TabsTrigger>
              <TabsTrigger value="sent">發送的訊息 ({user._count.sentMessages})</TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="mt-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">尚無收到的訊息</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <Card key={message.id} className="p-4 bg-card border-border shadow-none">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                              {message.type}
                            </span>
                            {!message.read && (
                              <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-600">
                                未讀
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground mb-1">{message.template}</p>
                          {message.customText && (
                            <p className="text-xs text-muted-foreground">{message.customText}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(message.createdAt).toLocaleString('zh-TW')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent" className="mt-4">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">尚無發送的訊息</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <Card key={message.id} className="p-4 bg-card border-border shadow-none">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                              {message.type}
                            </span>
                            {message.read && (
                              <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-600">
                                已讀
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground mb-1">{message.template}</p>
                          {message.customText && (
                            <p className="text-xs text-muted-foreground">{message.customText}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(message.createdAt).toLocaleString('zh-TW')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除用戶</DialogTitle>
            <DialogDescription>
              確定要刪除用戶「{user.nickname || user.phone}」嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDetailClient;
