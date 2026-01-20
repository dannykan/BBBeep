'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Check, X, Eye, Clock } from 'lucide-react';
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

interface Application {
  id: string;
  userId: string;
  licensePlate: string;
  vehicleType?: 'car' | 'scooter';
  status: 'pending' | 'approved' | 'rejected';
  licenseImage?: string;
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
  user: {
    id: string;
    phone: string;
    nickname?: string;
  };
}

const ApplicationsPage = React.memo(() => {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  useEffect(() => {
    filterApplications();
  }, [statusFilter, applications]);

  const getAdminToken = () => {
    return localStorage.getItem('admin_token');
  };

  const loadApplications = async () => {
    const token = getAdminToken();
    if (!token) {
      router.push('/BBBeepadmin2026');
      return;
    }

    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await axios.get(`${API_URL}/admin/license-plate-applications`, {
        params,
        headers: { 'x-admin-token': token },
      });
      setApplications(response.data);
      setFilteredApplications(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/BBBeepadmin2026');
        toast.error('登入已過期');
      } else {
        toast.error('載入申請失敗');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filterApplications = () => {
    if (statusFilter === 'all') {
      setFilteredApplications(applications);
    } else {
      setFilteredApplications(applications.filter((app) => app.status === statusFilter));
    }
  };

  const handleReview = (application: Application) => {
    setSelectedApplication(application);
    setReviewDecision('approved');
    setAdminNote('');
    setShowReviewDialog(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedApplication) return;

    const token = getAdminToken();
    if (!token) return;

    try {
      await axios.put(
        `${API_URL}/admin/license-plate-applications/${selectedApplication.id}/review`,
        {
          decision: reviewDecision,
          adminNote: adminNote || undefined,
        },
        {
          headers: { 'x-admin-token': token },
        }
      );
      toast.success('審核完成');
      setShowReviewDialog(false);
      loadApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '審核失敗');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'approved':
        return 'bg-green-500/10 text-green-600';
      case 'rejected':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待審核';
      case 'approved':
        return '已通過';
      case 'rejected':
        return '已拒絕';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

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
          <h1 className="text-lg font-bold text-foreground absolute left-1/2 -translate-x-1/2">車牌申請審核</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">總申請數</p>
                <p className="text-2xl font-bold text-foreground">{applications.length}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">待審核</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">已通過</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">已拒絕</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
              <X className="h-8 w-8 text-red-600" />
            </div>
          </Card>
        </div>

        {/* 篩選 */}
        <Card className="p-4 bg-card border-border shadow-none">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              全部
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
            >
              待審核 ({pendingCount})
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('approved')}
            >
              已通過 ({approvedCount})
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('rejected')}
            >
              已拒絕 ({rejectedCount})
            </Button>
          </div>
        </Card>

        {/* 申請列表 */}
        {filteredApplications.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">沒有找到申請</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <Card key={application.id} className="p-6 bg-card border-border shadow-none">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(application.status)}`}>
                        {getStatusLabel(application.status)}
                      </span>
                      <span className="text-lg font-mono font-bold text-foreground">
                        {application.licensePlate}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">申請人</p>
                        <p className="text-foreground">{application.user.phone}</p>
                        {application.user.nickname && (
                          <p className="text-xs text-muted-foreground">{application.user.nickname}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">車輛類型</p>
                        <p className="text-foreground">
                          {application.vehicleType === 'car' ? '汽車' : application.vehicleType === 'scooter' ? '機車' : '未設定'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">申請時間</p>
                        <p className="text-foreground">
                          {new Date(application.createdAt).toLocaleString('zh-TW')}
                        </p>
                      </div>
                      {application.reviewedAt && (
                        <div>
                          <p className="text-xs text-muted-foreground">審核時間</p>
                          <p className="text-foreground">
                            {new Date(application.reviewedAt).toLocaleString('zh-TW')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {application.status === 'pending' && (
                    <Button
                      onClick={() => handleReview(application)}
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      審核
                    </Button>
                  )}
                </div>

                {application.licenseImage && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">行照照片</p>
                    <a
                      href={application.licenseImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img
                        src={application.licenseImage}
                        alt="行照"
                        className="max-w-full h-auto max-h-48 rounded-lg border border-border"
                      />
                    </a>
                  </div>
                )}

                {application.adminNote && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">管理員備註</p>
                    <p className="text-sm text-foreground">{application.adminNote}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 審核對話框 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>審核車牌申請</DialogTitle>
            <DialogDescription>
              審核車牌 {selectedApplication?.licensePlate} 的申請
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedApplication?.licenseImage && (
              <div>
                <Label>行照照片</Label>
                <div className="mt-2">
                  <img
                    src={selectedApplication.licenseImage}
                    alt="行照"
                    className="max-w-full h-auto max-h-64 rounded-lg border border-border"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>審核結果</Label>
              <div className="flex gap-4">
                <Button
                  variant={reviewDecision === 'approved' ? 'default' : 'outline'}
                  onClick={() => setReviewDecision('approved')}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  通過
                </Button>
                <Button
                  variant={reviewDecision === 'rejected' ? 'default' : 'outline'}
                  onClick={() => setReviewDecision('rejected')}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  拒絕
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminNote">管理員備註（可選）</Label>
              <textarea
                id="adminNote"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="輸入審核備註..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">申請資訊</p>
              <div className="space-y-1 text-sm text-foreground">
                <p>申請人：{selectedApplication?.user.phone}</p>
                <p>車牌號碼：{selectedApplication?.licensePlate}</p>
                <p>車輛類型：{selectedApplication?.vehicleType === 'car' ? '汽車' : '機車'}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitReview}>
              {reviewDecision === 'approved' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  通過申請
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  拒絕申請
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

ApplicationsPage.displayName = 'ApplicationsPage';

export default ApplicationsPage;
