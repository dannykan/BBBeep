'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Plus, Car, Bike, Edit } from 'lucide-react';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UnboundLicensePlate {
  id: string;
  phone: string;
  licensePlate: string;
  userType: 'driver' | 'pedestrian';
  vehicleType?: 'car' | 'scooter';
  createdAt: string;
}

const LicensePlatesPage = React.memo(() => {
  const router = useRouter();
  const [unboundPlates, setUnboundPlates] = useState<UnboundLicensePlate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPlate, setNewPlate] = useState({
    licensePlate: '',
    vehicleType: 'car' as 'car' | 'scooter',
    userType: 'driver' as 'driver' | 'pedestrian',
  });

  useEffect(() => {
    loadUnboundPlates();
  }, []);

  const getAdminToken = () => {
    return localStorage.getItem('admin_token');
  };

  const loadUnboundPlates = async () => {
    const token = getAdminToken();
    if (!token) {
      router.push('/BBBeepadmin2026');
      return;
    }

    setIsLoading(true);
    try {
      // 獲取所有用戶，然後過濾出未綁定的（phone 以 unbound_ 開頭）
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { 'x-admin-token': token },
      });
      const unbound = response.data.filter((user: any) => user.phone.startsWith('unbound_'));
      setUnboundPlates(unbound);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/BBBeepadmin2026');
        toast.error('登入已過期');
      } else {
        toast.error('載入失敗');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlate = async () => {
    if (!newPlate.licensePlate.trim()) {
      toast.error('請輸入車牌號碼');
      return;
    }

    const token = getAdminToken();
    if (!token) return;

    try {
      await axios.post(
        `${API_URL}/admin/license-plates`,
        {
          licensePlate: newPlate.licensePlate.toUpperCase(),
          vehicleType: newPlate.vehicleType,
          userType: newPlate.userType,
        },
        {
          headers: { 'x-admin-token': token },
        }
      );
      toast.success('車牌已新增');
      setShowAddDialog(false);
      setNewPlate({
        licensePlate: '',
        vehicleType: 'car',
        userType: 'driver',
      });
      loadUnboundPlates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '新增失敗');
    }
  };

  if (isLoading) {
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
          <h1 className="text-lg font-bold text-foreground absolute left-1/2 -translate-x-1/2">車牌管理</h1>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="ml-auto"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增車牌
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Card className="p-6 bg-card border-border shadow-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">未綁定車牌列表</h2>
              <p className="text-sm text-muted-foreground">
                共 {unboundPlates.length} 個未綁定車牌
              </p>
            </div>

            {unboundPlates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">尚無未綁定車牌</p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="mt-4"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增第一個車牌
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unboundPlates.map((plate) => (
                  <Card
                    key={plate.id}
                    className="p-4 bg-card border-border shadow-none hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {plate.vehicleType === 'car' ? (
                          <Car className="h-4 w-4 text-primary" />
                        ) : (
                          <Bike className="h-4 w-4 text-primary" />
                        )}
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {plate.userType === 'driver' ? '駕駛' : '行人'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/BBBeepadmin2026/users/${plate.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">車牌號碼</p>
                        <p className="text-lg font-mono font-bold text-foreground">
                          {plate.licensePlate}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">車輛類型</p>
                        <p className="text-sm text-foreground">
                          {plate.vehicleType === 'car' ? '汽車' : plate.vehicleType === 'scooter' ? '機車' : '未設定'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">創建時間</p>
                        <p className="text-sm text-foreground">
                          {new Date(plate.createdAt).toLocaleString('zh-TW')}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 新增車牌對話框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增未綁定車牌</DialogTitle>
            <DialogDescription>
              新增一個尚未被用戶綁定的車牌號碼
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="licensePlate">車牌號碼 *</Label>
              <Input
                id="licensePlate"
                placeholder="ABC-1234"
                value={newPlate.licensePlate}
                onChange={(e) => setNewPlate({ ...newPlate, licensePlate: e.target.value.toUpperCase() })}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userType">用戶類型 *</Label>
              <select
                id="userType"
                value={newPlate.userType}
                onChange={(e) => setNewPlate({ ...newPlate, userType: e.target.value as 'driver' | 'pedestrian' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="driver">駕駛</option>
                <option value="pedestrian">行人</option>
              </select>
            </div>

            {newPlate.userType === 'driver' && (
              <div className="space-y-2">
                <Label htmlFor="vehicleType">車輛類型 *</Label>
                <select
                  id="vehicleType"
                  value={newPlate.vehicleType}
                  onChange={(e) => setNewPlate({ ...newPlate, vehicleType: e.target.value as 'car' | 'scooter' })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="car">汽車</option>
                  <option value="scooter">機車</option>
                </select>
              </div>
            )}

            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">注意事項：</p>
              <ul className="text-xs text-foreground space-y-1">
                <li>• 只能新增尚未被綁定的車牌</li>
                <li>• 電話號碼會自動設為 unbound_&lt;車牌&gt;_&lt;時間戳&gt;</li>
                <li>• 用戶註冊時可以綁定這些車牌</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddPlate} disabled={!newPlate.licensePlate.trim()}>
              新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

LicensePlatesPage.displayName = 'LicensePlatesPage';

export default LicensePlatesPage;
