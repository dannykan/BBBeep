'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, MoreVertical, ChevronRight, MapPin, Clock, Send, Sparkles, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import BottomNav from '@/components/layout/BottomNav';
import { formatDistanceToNow } from 'date-fns';
import { messagesApi, usersApi, aiApi } from '@/lib/api-services';
import { formatLocationDisplay } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const InboxPage = React.memo(() => {
  const router = useRouter();
  const { user, messages, refreshMessages, refreshUser } = useApp();
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  // 自訂回覆相關 state
  const [showCustomReply, setShowCustomReply] = useState(false);
  const [customReplyText, setCustomReplyText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiLimit, setAiLimit] = useState({ canUse: true, remaining: 5 });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    refreshMessages();
    checkAiLimit();
  }, [user, router, refreshMessages]);

  const checkAiLimit = async () => {
    try {
      const limit = await aiApi.checkLimit();
      setAiLimit(limit);
    } catch (error) {
      console.error('Failed to check AI limit:', error);
    }
  };

  const selectedMsg = messages.find((m) => m.id === selectedMessage);

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
      });
    } catch {
      return '未知時間';
    }
  };

  const formatOccurredTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const handleMessageClick = async (id: string) => {
    setSelectedMessage(id);
    // 點擊查看消息時自動標記為已讀（通過 getOne API 自動處理）
    try {
      // 調用 getOne 會自動標記為已讀
      await messagesApi.getOne(id);
      await refreshMessages();
    } catch (error) {
      console.error('Failed to load message:', error);
    }
  };

  const handleBlockSender = async () => {
    if (!selectedMsg?.sender?.id) {
      toast.error('無法識別發送者');
      return;
    }

    try {
      await usersApi.blockUser(selectedMsg.sender.id);
      toast.success('已封鎖該用戶');
      setSelectedMessage(null);
      setShowBlockDialog(false);
      await refreshUser();
      await refreshMessages();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '封鎖失敗');
    }
  };

  const handleReportMessage = async () => {
    if (!selectedMessage) {
      toast.error('無法識別訊息');
      return;
    }

    setIsReporting(true);
    try {
      await messagesApi.report(selectedMessage, reportReason.trim() || undefined);
      toast.success('檢舉已提交，我們會儘快處理');
      setSelectedMessage(null);
      setShowReportDialog(false);
      setReportReason('');
      await refreshMessages();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '檢舉失敗');
    } finally {
      setIsReporting(false);
    }
  };

  const handleQuickReply = async (replyText: string) => {
    if (!selectedMessage) return;

    setIsReplying(true);
    try {
      await messagesApi.reply(selectedMessage, replyText, { isQuickReply: true });
      toast.success('回覆已送出');
      await refreshMessages();
      await refreshUser();
      resetCustomReply();
      setSelectedMessage(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '回覆失敗');
    } finally {
      setIsReplying(false);
    }
  };

  const resetCustomReply = () => {
    setShowCustomReply(false);
    setCustomReplyText('');
    setAiSuggestion('');
  };

  const handleGetAiSuggestion = async () => {
    if (!customReplyText.trim() || customReplyText.trim().length < 5) {
      toast.error('回覆內容至少需要 5 個字');
      return;
    }

    setIsLoadingAi(true);
    try {
      const result = await aiApi.rewrite(customReplyText, undefined, '回覆');
      setAiSuggestion(result.rewritten);
      await checkAiLimit();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'AI 改寫失敗');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleCustomReply = async (useAi: boolean) => {
    if (!selectedMessage) return;

    const replyText = useAi && aiSuggestion ? aiSuggestion : customReplyText;
    if (!replyText.trim()) {
      toast.error('請輸入回覆內容');
      return;
    }

    if (replyText.trim().length < 5) {
      toast.error('回覆內容至少需要 5 個字');
      return;
    }

    setIsReplying(true);
    try {
      await messagesApi.reply(selectedMessage, replyText, { useAiRewrite: useAi });
      toast.success('回覆已送出');
      await refreshMessages();
      await refreshUser();
      resetCustomReply();
      setSelectedMessage(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '回覆失敗');
    } finally {
      setIsReplying(false);
    }
  };

  const canAfford = (cost: number) => (user?.points ?? 0) >= cost;

  const getMessageAccentColor = (type: string) => {
    switch (type) {
      case '車況提醒':
        return 'border-l-[3px] border-l-accent-vehicle';
      case '行車安全提醒':
        return 'border-l-[3px] border-l-accent-safety';
      case '讚美感謝':
        return 'border-l-[3px] border-l-accent-praise';
      default:
        return '';
    }
  };

  const getTagColor = (type: string) => {
    switch (type) {
      case '車況提醒':
        return 'bg-accent-vehicle/10 text-accent-vehicle';
      case '行車安全提醒':
        return 'bg-accent-safety/10 text-accent-safety';
      case '讚美感謝':
        return 'bg-accent-praise/10 text-accent-praise';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!user) return null;

  if (user.userType === 'pedestrian') {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-card border-b border-border">
          <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between relative">
            <button
              onClick={() => router.push('/home')}
              className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
              <span className="text-sm text-muted-foreground">返回</span>
            </button>
            <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">收件箱</h1>
            <div className="w-[80px]" />
          </div>
        </div>
        <div className="max-w-md mx-auto p-6">
          <Card className="p-8 text-center space-y-4">
            <p className="text-foreground">行人用戶無法接收提醒</p>
            <p className="text-sm text-muted-foreground">
              因為沒有車牌號碼，其他人無法向您發送提醒
            </p>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (selectedMessage && selectedMsg) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between relative">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                  <span className="text-sm text-muted-foreground">返回</span>
                </button>
            <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">提醒詳情</h1>
            <div className="w-[80px]" />

            {selectedMsg.sender && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-auto p-1 hover:bg-muted/50 rounded transition-colors">
                    <MoreVertical className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => {
                      setShowBlockDialog(true);
                    }}
                    className="text-sm cursor-pointer"
                  >
                    封鎖此用戶
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setShowReportDialog(true);
                    }}
                    className="text-sm text-destructive cursor-pointer focus:text-destructive"
                  >
                    檢舉訊息內容
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="max-w-md mx-auto p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className={`inline-block px-2.5 py-1 rounded-md text-xs ${getTagColor(selectedMsg.type)}`}>
              {selectedMsg.type}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(selectedMsg.createdAt)}
            </span>
          </div>

          <Card className="p-5 space-y-4 bg-card border-border shadow-none">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-base text-foreground leading-relaxed">{selectedMsg.template}</p>
            </div>

            {selectedMsg.customText && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">補充說明</p>
                <p className="text-base text-foreground leading-relaxed">{selectedMsg.customText}</p>
              </div>
            )}

            {/* 事發地點和時間 */}
            {(selectedMsg.location || selectedMsg.occurredAt) && (
              <div className="flex flex-wrap gap-3 text-sm">
                {selectedMsg.location && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{formatLocationDisplay(selectedMsg.location)}</span>
                  </div>
                )}
                {selectedMsg.occurredAt && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>事發時間 {formatOccurredTime(selectedMsg.occurredAt)}</span>
                  </div>
                )}
              </div>
            )}

            {selectedMsg.sender && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">發送者</p>
                <p className="text-sm text-foreground mt-1">
                  {selectedMsg.sender.nickname || '匿名'}
                </p>
              </div>
            )}
          </Card>

          {selectedMsg.replyText && (
            <Card className="p-4 bg-primary/5 border-primary/20 shadow-none">
              <p className="text-xs text-muted-foreground mb-2">您的回覆</p>
              <p className="text-sm text-foreground leading-relaxed">{selectedMsg.replyText}</p>
            </Card>
          )}

          {selectedMsg.type === '讚美感謝' && !selectedMsg.replyText && (
            <div className="px-4 py-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground leading-relaxed">
                收到讚美後回應「收到」可獲得 1 點回饋
              </p>
            </div>
          )}

          {/* 回覆區塊 */}
          {!selectedMsg.replyText && (
            <div className="space-y-4">
              {/* 快速回覆按鈕 */}
              {!showCustomReply && (
                <div className="space-y-3">
                  {selectedMsg.type === '讚美感謝' ? (
                    <Button
                      className="w-full bg-primary hover:bg-primary-dark text-white"
                      onClick={() => handleQuickReply('收到，謝謝！')}
                      disabled={isReplying}
                    >
                      {isReplying ? '處理中...' : '收到，謝謝！（免費）'}
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-primary hover:bg-primary-dark text-white"
                      onClick={() => handleQuickReply('收到，感謝提醒！')}
                      disabled={isReplying}
                    >
                      {isReplying ? '處理中...' : '收到，感謝提醒！（免費）'}
                    </Button>
                  )}
                  <button
                    onClick={() => setShowCustomReply(true)}
                    className="w-full h-11 bg-card border-2 border-border hover:border-primary text-foreground rounded-xl transition-all font-medium text-sm"
                  >
                    自訂回覆
                  </button>
                </div>
              )}

              {/* 自訂回覆輸入區 */}
              {showCustomReply && !aiSuggestion && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        value={customReplyText}
                        onChange={(e) => setCustomReplyText(e.target.value.slice(0, 100))}
                        placeholder="輸入您的回覆（5-100字）"
                        className="pr-12 h-11"
                        maxLength={100}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums ${
                        customReplyText.length < 5 && customReplyText.length > 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {customReplyText.length}/100
                      </span>
                    </div>
                  </div>

                  {/* AI 使用次數提示 */}
                  {customReplyText.trim().length >= 5 && (
                    <Card className="p-3 bg-primary/5 border-primary/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm text-foreground">AI 協助改寫</span>
                        </div>
                        {aiLimit.canUse ? (
                          <span className="text-xs font-medium text-primary tabular-nums">
                            今日剩餘 {aiLimit.remaining}/5 次
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-destructive">
                            今日已用完
                          </span>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* 操作按鈕 */}
                  <div className="space-y-3">
                    {customReplyText.trim().length < 5 ? (
                      customReplyText.length > 0 && (
                        <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span className="text-sm text-destructive">回覆內容至少需要 5 個字</span>
                          </div>
                        </div>
                      )
                    ) : (
                      <>
                        {/* AI 協助改寫 */}
                        {aiLimit.canUse ? (
                          <button
                            onClick={handleGetAiSuggestion}
                            disabled={isLoadingAi}
                            className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all font-medium text-sm disabled:opacity-50"
                          >
                            {isLoadingAi ? '處理中...' : `AI 協助改寫（剩 ${aiLimit.remaining} 次）`}
                          </button>
                        ) : (
                          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span className="text-sm font-medium text-destructive">AI 已達今日上限</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              每日限制 5 次，明天會自動重置
                            </p>
                          </div>
                        )}

                        {/* 不用 AI，直接送出 */}
                        {canAfford(4) ? (
                          <button
                            onClick={() => handleCustomReply(false)}
                            disabled={isReplying}
                            className="w-full h-11 bg-card border-2 border-border hover:border-primary text-foreground rounded-xl transition-all font-medium text-sm disabled:opacity-50"
                          >
                            {isReplying ? '處理中...' : '不用 AI，直接送出（4 點）'}
                          </button>
                        ) : (
                          <div className="p-3 bg-muted/30 border border-border rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">
                              直接送出需要 4 點（點數不足）
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    <button
                      onClick={resetCustomReply}
                      className="w-full h-10 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      取消
                    </button>
                  </div>

                  {/* 點數說明 */}
                  <Card className="p-4 bg-muted/30 border-border">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">快速回覆</span>
                        <span className="font-medium text-secondary">免費</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">自訂回覆（AI 協助）</span>
                        <span className="font-medium tabular-nums">2 點</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">自訂回覆（不用 AI）</span>
                        <span className="font-medium tabular-nums">4 點</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* AI 建議版本 */}
              {showCustomReply && aiSuggestion && (
                <div className="space-y-4">
                  {/* 原版 */}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">原本的版本</div>
                    <Card className="p-3 bg-muted/30 border-border">
                      <p className="text-sm text-muted-foreground line-through">{customReplyText}</p>
                    </Card>
                  </div>

                  {/* AI 建議版 */}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">AI 建議版本</div>
                    <Card className="p-3 bg-primary/5 border-primary/30">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-foreground leading-relaxed">{aiSuggestion}</p>
                      </div>
                    </Card>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="space-y-3">
                    {canAfford(2) ? (
                      <button
                        onClick={() => handleCustomReply(true)}
                        disabled={isReplying}
                        className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all font-medium text-sm disabled:opacity-50"
                      >
                        {isReplying ? '處理中...' : '用建議版送出（2 點）'}
                      </button>
                    ) : (
                      <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium text-destructive">點數不足</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          目前剩餘 {user?.points ?? 0} 點，使用 AI 協助需要 2 點
                        </p>
                      </div>
                    )}

                    {canAfford(4) ? (
                      <button
                        onClick={() => handleCustomReply(false)}
                        disabled={isReplying}
                        className="w-full h-11 bg-card border-2 border-border hover:border-primary text-foreground rounded-xl transition-all font-medium text-sm disabled:opacity-50"
                      >
                        {isReplying ? '處理中...' : '用原版送出（4 點）'}
                      </button>
                    ) : (
                      <div className="p-3 bg-muted/30 border border-border rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">
                          原版需要 4 點（點數不足）
                        </p>
                      </div>
                    )}

                    <button
                      onClick={resetCustomReply}
                      className="w-full h-10 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 已回覆的消息顯示確定按鈕 */}
          {selectedMsg.replyText && (
            <div className="space-y-2">
              <Button
                className="w-full bg-primary hover:bg-primary-dark text-white"
                onClick={() => {
                  resetCustomReply();
                  setSelectedMessage(null);
                }}
              >
                確定
              </Button>
            </div>
          )}
        </div>

        <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>封鎖用戶</DialogTitle>
              <DialogDescription>
                確定要封鎖「{selectedMsg?.sender?.nickname || '匿名'}」嗎？封鎖後您將無法發送也無法接收該用戶的提醒。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleBlockSender}>
                確認封鎖
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>檢舉訊息內容</DialogTitle>
              <DialogDescription>
                檢舉此訊息將提交給管理員審核。請說明檢舉原因（選填）。
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground">檢舉原因（選填）</label>
                <Textarea
                  placeholder="請說明檢舉原因..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="min-h-[100px] resize-none"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {reportReason.length}/200
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowReportDialog(false);
                setReportReason('');
              }}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleReportMessage} disabled={isReporting}>
                {isReporting ? '提交中...' : '確認檢舉'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const unreadMessages = messages.filter((m) => !m.read);
  const allMessages = messages;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between relative">
          <button
            onClick={() => router.push('/home')}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">收件箱</h1>
          {unreadMessages.length > 0 ? (
            <div className="min-w-[20px] h-5 px-1.5 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs text-primary-foreground font-medium tabular-nums">
                {unreadMessages.length > 99 ? '99+' : unreadMessages.length}
              </span>
            </div>
          ) : (
            <div className="w-[80px]" />
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-4">
        {allMessages.length === 0 ? (
          <Card className="p-8 text-center space-y-4">
            <p className="text-foreground">尚無訊息</p>
            <p className="text-sm text-muted-foreground">當您收到提醒時，會顯示在這裡</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {allMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => handleMessageClick(message.id)}
                className={`w-full p-4 text-left hover:bg-muted/30 transition-colors bg-card border border-border rounded-lg ${getMessageAccentColor(message.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${getTagColor(message.type)}`}>
                        {message.type}
                      </span>
                      {!message.read && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                      <span className="text-xs text-muted-foreground tabular-nums ml-auto">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-base text-foreground line-clamp-1 mb-1 font-medium">
                      {message.template}
                    </p>
                    {message.customText && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {message.customText}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" strokeWidth={1.5} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
});

InboxPage.displayName = 'InboxPage';

export default InboxPage;
