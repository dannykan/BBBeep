'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, FileText, Smartphone, Home } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AppContent {
  id: string;
  landingTagline: string;
  landingSubtext: string;
  homeHeroTitle: string;
  homeHeroSubtitle: string;
  updatedAt: string;
}

const AppContentPage = React.memo(() => {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState<AppContent | null>(null);

  // Form state
  const [landingTagline, setLandingTagline] = useState('');
  const [landingSubtext, setLandingSubtext] = useState('');
  const [homeHeroTitle, setHomeHeroTitle] = useState('');
  const [homeHeroSubtitle, setHomeHeroSubtitle] = useState('');

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

  const loadData = async () => {
    if (!adminToken) return;

    setIsLoading(true);
    try {
      const response = await axios.get<AppContent>(`${API_URL}/admin/app-content`, {
        headers: { 'x-admin-token': adminToken },
      });

      const data = response.data;
      setContent(data);

      // Update form state
      setLandingTagline(data.landingTagline);
      setLandingSubtext(data.landingSubtext);
      setHomeHeroTitle(data.homeHeroTitle);
      setHomeHeroSubtitle(data.homeHeroSubtitle);
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

  const handleSave = async () => {
    if (!adminToken) return;

    setIsSaving(true);
    try {
      await axios.put(
        `${API_URL}/admin/app-content`,
        {
          landingTagline,
          landingSubtext,
          homeHeroTitle,
          homeHeroSubtitle,
        },
        {
          headers: { 'x-admin-token': adminToken },
        }
      );
      toast.success('內容已儲存');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '儲存失敗');
    } finally {
      setIsSaving(false);
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
          <h1 className="text-base text-foreground">應用程式內容</h1>
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
            {content && (
              <div className="text-xs text-muted-foreground text-right">
                最後更新：{formatDate(content.updatedAt)}
              </div>
            )}

            {/* Landing Page 設定 */}
            <Card className="p-6 bg-card border-border shadow-none">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-foreground">Landing Page</h2>
                  <p className="text-xs text-muted-foreground">登入前的歡迎頁面內容</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="landingTagline">主標題 (Tagline)</Label>
                  <Textarea
                    id="landingTagline"
                    value={landingTagline}
                    onChange={(e) => setLandingTagline(e.target.value)}
                    placeholder="讓路上多一點善意 💙"
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">顯示在 Logo 下方的主要標語</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landingSubtext">副標題 (Subtext)</Label>
                  <Textarea
                    id="landingSubtext"
                    value={landingSubtext}
                    onChange={(e) => setLandingSubtext(e.target.value)}
                    placeholder="透過車牌發送善意提醒&#10;讓每一位駕駛更安全"
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">使用換行 (Enter) 來分隔多行文字</p>
                </div>
              </div>
            </Card>

            {/* 首頁 Hero 設定 */}
            <Card className="p-6 bg-card border-border shadow-none">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-foreground">首頁 Hero 區塊</h2>
                  <p className="text-xs text-muted-foreground">登入後首頁最上方的標題區</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="homeHeroTitle">Hero 標題</Label>
                  <Textarea
                    id="homeHeroTitle"
                    value={homeHeroTitle}
                    onChange={(e) => setHomeHeroTitle(e.target.value)}
                    placeholder="讓路上多一點善意 💙"
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="homeHeroSubtitle">Hero 副標題</Label>
                  <Textarea
                    id="homeHeroSubtitle"
                    value={homeHeroSubtitle}
                    onChange={(e) => setHomeHeroSubtitle(e.target.value)}
                    placeholder="透過車牌發送善意提醒，讓駕駛更安全"
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            </Card>

            {/* 儲存按鈕 */}
            <Button
              className="w-full h-11 bg-primary hover:bg-primary-dark"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '儲存中...' : '儲存所有變更'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
});

AppContentPage.displayName = 'AppContentPage';

export default AppContentPage;
