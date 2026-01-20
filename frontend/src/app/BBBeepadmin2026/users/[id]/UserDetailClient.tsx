'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Edit, Save, X, Trash2, MessageSquare, Ban, ShieldOff } from 'lucide-react';
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
  phone?: string;
  nickname?: string;
  licensePlate?: string;
  userType: 'driver' | 'pedestrian';
  vehicleType?: 'car' | 'scooter';
  points: number;
  hasCompletedOnboarding: boolean;
  email?: string;
  // LINE Login 相關
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  // 官方封鎖相關
  isBlockedByAdmin?: boolean;
  blockedByAdminAt?: string;
  blockedByAdminReason?: string;
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
    licensePlate?: string;
  };
  receiver?: {
    id: string;
    nickname?: string;
    licensePlate?: string;
  };
}

interface UserDetailClientProps {
  userId: string;
}

const UserDetailClient: React.FC<UserDetailClientProps> = ({ userId }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageType, setMessageType] = useState<'received' | 'sent'>('received');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserDetail>>({});
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showEditMessageDialog, setShowEditMessageDialog] = useState(false);
  const [editMessageData, setEditMessageData] = useState<{ template?: string; customText?: string; read?: boolean }>({});
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (user) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, messageType]);

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
      const response = await axios.get(`${API_URL}/admin/users/${userId}`, {
        headers: { 'x-admin-token': token },
      });
      setUser(response.data);
      setEditData({
        nickname: response.data.nickname || '',
        licensePlate: response.data.licensePlate || '',
        points: response.data.points,
        email: response.data.email || '',
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

  const loadMessages = async () => {
    const token = getAdminToken();
    if (!token || !user) return;

    try {
      const response = await axios.get(`${API_URL}/admin/users/${userId}/messages`, {
        params: { type: messageType },
        headers: { 'x-admin-token': token },
      });
      setMessages(response.data);
    } catch (error: any) {
      toast.error('載入消息失敗');
    }
  };

  const handleSaveUser = async () => {
    const token = getAdminToken();
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/admin/users/${userId}`,
        editData,
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

  const handleEditMessage = (message: Message) => {
    setSelectedMessage(message);
    setEditMessageData({
      template: message.template,
      customText: message.customText || '',
      read: message.read,
    });
    setShowEditMessageDialog(true);
  };

  const handleSaveMessage = async () => {
    if (!selectedMessage) return;

    const token = getAdminToken();
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/admin/messages/${selectedMessage.id}`,
        editMessageData,
        {
          headers: { 'x-admin-token': token },
        }
      );
      toast.success('消息已更新');
      setShowEditMessageDialog(false);
      loadMessages();
    } catch (error: any) {
      toast.error('更新失敗');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('確定要刪除這條消息嗎？')) return;

    const token = getAdminToken();
    if (!token) return;

    try {
      await axios.delete(`${API_URL}/admin/messages/${messageId}`, {
        headers: { 'x-admin-token': token },
      });
      toast.success('消息已刪除');
      loadMessages();
    } catch (error: any) {
      toast.error('刪除失敗');
    }
  };

  const handleBlockUser = async () => {
    const token = getAdminToken();
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/admin/users/${userId}/block`,
        { reason: blockReason || undefined },
        { headers: { 'x-admin-token': token } }
      );
      toast.success('用戶已封鎖');
      setShowBlockDialog(false);
      setBlockReason('');
      loadUserData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '封鎖失敗');
    }
  };

  const handleUnblockUser = async () => {
    if (!confirm('確定要解除封鎖此用戶嗎？')) return;

    const token = getAdminToken();
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/admin/users/${userId}/unblock`,
        {},
        { headers: { 'x-admin-token': token } }
      );
      toast.success('已解除封鎖');
      loadUserData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '解除封鎖失敗');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
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
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="ml-auto"
            >
              <Edit className="h-4 w-4 mr-2" />
              編輯
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">用戶資料</TabsTrigger>
            <TabsTrigger value="messages">收件夾</TabsTrigger>
            <TabsTrigger value="sent">發送記錄</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card className="p-6 bg-card border-border shadow-none">
              <div className="space-y-4">
                {/* 封鎖狀態警告 */}
                {user.isBlockedByAdmin && (
                  <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <Ban className="h-6 w-6 text-red-600" />
                      <div>
                        <p className="text-sm text-red-600 font-medium">此用戶已被封鎖</p>
                        {user.blockedByAdminReason && (
                          <p className="text-xs text-red-500">原因：{user.blockedByAdminReason}</p>
                        )}
                        {user.blockedByAdminAt && (
                          <p className="text-xs text-red-400">
                            封鎖時間：{new Date(user.blockedByAdminAt).toLocaleString('zh-TW')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnblockUser}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <ShieldOff className="h-4 w-4 mr-2" />
                      解除封鎖
                    </Button>
                  </div>
                )}

                {/* LINE 頭像和名稱 */}
                {user.lineUserId && (
                  <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    {user.linePictureUrl && (
                      <img
                        src={user.linePictureUrl}
                        alt="LINE 頭像"
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <p className="text-sm text-green-600 font-medium">LINE 用戶</p>
                      <p className="text-foreground">{user.lineDisplayName || 'LINE 用戶'}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* LINE ID */}
                  {user.lineUserId && (
                    <div className="space-y-2">
                      <Label>LINE User ID</Label>
                      <Input value={user.lineUserId} disabled className="bg-muted font-mono text-xs" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>手機號碼</Label>
                    <Input value={user.phone || '未綁定'} disabled className="bg-muted" />
                  </div>

                  <div className="space-y-2">
                    <Label>暱稱</Label>
                    {isEditing ? (
                      <Input
                        value={editData.nickname || ''}
                        onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
                      />
                    ) : (
                      <Input value={user.nickname || '未設定'} disabled className="bg-muted" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>車牌號碼</Label>
                    {isEditing ? (
                      <Input
                        value={editData.licensePlate || ''}
                        onChange={(e) => setEditData({ ...editData, licensePlate: e.target.value.toUpperCase() })}
                      />
                    ) : (
                      <Input value={user.licensePlate || '未設定'} disabled className="bg-muted" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>點數</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editData.points || 0}
                        onChange={(e) => setEditData({ ...editData, points: parseInt(e.target.value) || 0 })}
                      />
                    ) : (
                      <Input value={user.points} disabled className="bg-muted" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>用戶類型</Label>
                    <Input value={user.userType === 'driver' ? '駕駛' : '行人'} disabled className="bg-muted" />
                  </div>

                  <div className="space-y-2">
                    <Label>車輛類型</Label>
                    <Input
                      value={user.vehicleType === 'car' ? '汽車' : user.vehicleType === 'scooter' ? '機車' : '未設定'}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>電子郵件</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={editData.email || ''}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      />
                    ) : (
                      <Input value={user.email || '未設定'} disabled className="bg-muted" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>註冊時間</Label>
                    <Input value={new Date(user.createdAt).toLocaleString('zh-TW')} disabled className="bg-muted" />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveUser}>
                      <Save className="h-4 w-4 mr-2" />
                      儲存
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        nickname: user.nickname || '',
                        licensePlate: user.licensePlate || '',
                        points: user.points,
                        email: user.email || '',
                      });
                    }}>
                      <X className="h-4 w-4 mr-2" />
                      取消
                    </Button>
                  </div>
                )}

                {/* 封鎖用戶按鈕 */}
                {!isEditing && !user.isBlockedByAdmin && (
                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => setShowBlockDialog(true)}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      封鎖此用戶
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <Card className="p-6 bg-card border-border shadow-none">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">收件夾 ({messages.length})</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMessageType('received');
                      loadMessages();
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    刷新
                  </Button>
                </div>

                {messages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">尚無消息</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                {message.type}
                              </span>
                              {message.read ? (
                                <span className="text-xs text-muted-foreground">已讀</span>
                              ) : (
                                <span className="text-xs text-primary">未讀</span>
                              )}
                            </div>
                            <p className="text-sm text-foreground">{message.template}</p>
                            {message.customText && (
                              <p className="text-xs text-muted-foreground">{message.customText}</p>
                            )}
                            {message.sender && (
                              <p className="text-xs text-muted-foreground">
                                發送者：{message.sender.nickname || '匿名'} ({message.sender.licensePlate || '無車牌'})
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(message.createdAt).toLocaleString('zh-TW')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditMessage(message)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            <Card className="p-6 bg-card border-border shadow-none">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">發送記錄 ({messages.length})</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMessageType('sent');
                      loadMessages();
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    刷新
                  </Button>
                </div>

                {messages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">尚無發送記錄</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                {message.type}
                              </span>
                              {message.read ? (
                                <span className="text-xs text-muted-foreground">已讀</span>
                              ) : (
                                <span className="text-xs text-primary">未讀</span>
                              )}
                            </div>
                            <p className="text-sm text-foreground">{message.template}</p>
                            {message.customText && (
                              <p className="text-xs text-muted-foreground">{message.customText}</p>
                            )}
                            {message.receiver && (
                              <p className="text-xs text-muted-foreground">
                                接收者：{message.receiver.nickname || '匿名'} ({message.receiver.licensePlate || '無車牌'})
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(message.createdAt).toLocaleString('zh-TW')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditMessage(message)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 編輯消息對話框 */}
      <Dialog open={showEditMessageDialog} onOpenChange={setShowEditMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>編輯消息</DialogTitle>
            <DialogDescription>修改消息內容和狀態</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>消息內容</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editMessageData.template || ''}
                onChange={(e) => setEditMessageData({ ...editMessageData, template: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>補充說明</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editMessageData.customText || ''}
                onChange={(e) => setEditMessageData({ ...editMessageData, customText: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="read"
                checked={editMessageData.read || false}
                onChange={(e) => setEditMessageData({ ...editMessageData, read: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="read" className="cursor-pointer">已讀</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditMessageDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveMessage}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 封鎖用戶對話框 */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>封鎖用戶</DialogTitle>
            <DialogDescription>
              封鎖後，此用戶將無法登入使用服務。確定要封鎖此用戶嗎？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-foreground font-medium mb-2">用戶資訊</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                {user?.lineDisplayName && <p>LINE 名稱：{user.lineDisplayName}</p>}
                {user?.phone && <p>手機號碼：{user.phone}</p>}
                {user?.nickname && <p>暱稱：{user.nickname}</p>}
                {user?.licensePlate && <p>車牌號碼：{user.licensePlate}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockReason">封鎖原因（可選）</Label>
              <textarea
                id="blockReason"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="輸入封鎖原因..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBlockDialog(false);
              setBlockReason('');
            }}>
              取消
            </Button>
            <Button onClick={handleBlockUser} className="bg-red-600 hover:bg-red-700 text-white">
              <Ban className="h-4 w-4 mr-2" />
              確認封鎖
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDetailClient;
