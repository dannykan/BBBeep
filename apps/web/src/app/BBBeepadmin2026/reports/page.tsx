'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface MessageReport {
  id: string;
  messageId: string;
  reason?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string | null;
  message: {
    id: string;
    type: string;
    template: string;
    customText?: string;
    sender: {
      id: string;
      phone: string;
      nickname?: string;
      licensePlate?: string;
    };
    receiver: {
      id: string;
      phone: string;
      nickname?: string;
      licensePlate?: string;
    };
  };
  reporter: {
    id: string;
    phone: string;
    nickname?: string;
    licensePlate?: string;
  };
}

const ReportsPage = React.memo(() => {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<MessageReport[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'reviewed' | 'resolved' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MessageReport | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'reviewed' | 'resolved'>('reviewed');
  const [adminNote, setAdminNote] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
    } else {
      router.push('/BBBeepadmin2026');
    }
  }, [router]);

  useEffect(() => {
    if (adminToken) {
      loadReports();
    }
  }, [adminToken, selectedStatus]);

  const loadReports = async () => {
    if (!adminToken) return;

    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const response = await axios.get(`${API_URL}/admin/message-reports`, {
        params,
        headers: {
          'x-admin-token': adminToken,
        },
      });
      setReports(response.data);
      setFilteredReports(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/BBBeepadmin2026');
        toast.error('登入已過期，請重新登入');
      } else {
        toast.error(error.response?.data?.message || '載入檢舉記錄失敗');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedReport || !adminToken) return;

    setIsReviewing(true);
    try {
      await axios.put(
        `${API_URL}/admin/message-reports/${selectedReport.id}/review`,
        {
          decision: reviewDecision,
          adminNote: adminNote.trim() || undefined,
        },
        {
          headers: {
            'x-admin-token': adminToken,
          },
        },
      );
      toast.success('審核完成');
      setShowReviewDialog(false);
      setAdminNote('');
      setSelectedReport(null);
      loadReports();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '審核失敗');
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            待審核
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
            <CheckCircle className="h-3 w-3" />
            已審核
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            已處理
          </span>
        );
      default:
        return null;
    }
  };

  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const reviewedCount = reports.filter((r) => r.status === 'reviewed').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/BBBeepadmin2026')}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-xl font-bold text-foreground flex-1">檢舉訊息管理</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">總檢舉數</p>
                <p className="text-2xl font-bold text-foreground">{reports.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
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
                <p className="text-xs text-muted-foreground mb-1">已審核</p>
                <p className="text-2xl font-bold text-blue-600">{reviewedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">已處理</p>
                <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </Card>
        </div>

        {/* 篩選 */}
        <Card className="p-4 bg-card border-border shadow-none">
          <div className="flex gap-2">
            <Button
              variant={selectedStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('all')}
            >
              全部
            </Button>
            <Button
              variant={selectedStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('pending')}
            >
              待審核
            </Button>
            <Button
              variant={selectedStatus === 'reviewed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('reviewed')}
            >
              已審核
            </Button>
            <Button
              variant={selectedStatus === 'resolved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('resolved')}
            >
              已處理
            </Button>
          </div>
        </Card>

        {/* 檢舉列表 */}
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">載入中...</p>
          </Card>
        ) : filteredReports.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">沒有檢舉記錄</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="p-6 bg-card border-border shadow-none">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(report.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleString('zh-TW')}
                      </span>
                    </div>
                  </div>
                  {report.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReport(report);
                        setReviewDecision('reviewed');
                        setAdminNote('');
                        setShowReviewDialog(true);
                      }}
                    >
                      審核
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* 訊息內容 */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">被檢舉的訊息</p>
                    <p className="text-base text-foreground mb-2">{report.message.template}</p>
                    {report.message.customText && (
                      <p className="text-sm text-muted-foreground">{report.message.customText}</p>
                    )}
                  </div>

                  {/* 檢舉原因 */}
                  {report.reason && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">檢舉原因</p>
                      <p className="text-sm text-foreground">{report.reason}</p>
                    </div>
                  )}

                  {/* 相關人員 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">檢舉者</p>
                      <p className="text-sm font-medium text-foreground">
                        {report.reporter.nickname || '匿名'}
                      </p>
                      <p className="text-xs text-muted-foreground">{report.reporter.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">發送者</p>
                      <p className="text-sm font-medium text-foreground">
                        {report.message.sender.nickname || '匿名'}
                      </p>
                      <p className="text-xs text-muted-foreground">{report.message.sender.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">接收者</p>
                      <p className="text-sm font-medium text-foreground">
                        {report.message.receiver.nickname || '匿名'}
                      </p>
                      <p className="text-xs text-muted-foreground">{report.message.receiver.phone}</p>
                    </div>
                  </div>

                  {/* 管理員備註 */}
                  {report.adminNote && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">管理員備註</p>
                      <p className="text-sm text-foreground">{report.adminNote}</p>
                      {report.reviewedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          審核時間：{new Date(report.reviewedAt).toLocaleString('zh-TW')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 審核對話框 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>審核檢舉</DialogTitle>
            <DialogDescription>請選擇審核結果並填寫備註（選填）</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-foreground">審核結果</label>
              <div className="flex gap-2">
                <Button
                  variant={reviewDecision === 'reviewed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviewDecision('reviewed')}
                >
                  已審核
                </Button>
                <Button
                  variant={reviewDecision === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviewDecision('resolved')}
                >
                  已處理
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-foreground">管理員備註（選填）</label>
              <Textarea
                placeholder="輸入備註..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              取消
            </Button>
            <Button onClick={handleReview} disabled={isReviewing}>
              {isReviewing ? '處理中...' : '確認審核'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

ReportsPage.displayName = 'ReportsPage';

export default ReportsPage;
