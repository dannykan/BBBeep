'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Car, Bike, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/layout/BottomNav';
import {
  VehicleType,
  getSituationsByVehicleType,
  getMessageByVehicleType,
  formatPlateNumber,
  validatePlateFormat,
  getPlatePlaceholder,
} from '@/data/vehicleTemplates';
import { messagesApi, aiApi } from '@/lib/api-services';
import type { MessageType } from '@/types';
import { normalizeLicensePlate, displayLicensePlate } from '@/lib/license-plate-format';

type ReminderCategory = '車況提醒' | '行車安全提醒' | '讚美感謝';
type SendStep = 'vehicle-type' | 'plate-input' | 'category' | 'situation' | 'review' | 'custom' | 'ai-suggest' | 'confirm' | 'success';

const SendPage = React.memo(() => {
  const router = useRouter();
  const { user, refreshUser, refreshMessages } = useApp();
  const [step, setStep] = useState<SendStep>('vehicle-type');
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [targetPlate, setTargetPlate] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReminderCategory | null>(null);
  const [selectedSituation, setSelectedSituation] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [customText, setCustomText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [useAiVersion, setUseAiVersion] = useState(false);
  const [usedAi, setUsedAi] = useState(false);
  const [aiLimit, setAiLimit] = useState({ canUse: true, remaining: 5 });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    checkAiLimit();
  }, [user, router]);

  const checkAiLimit = async () => {
    try {
      const limit = await aiApi.checkLimit();
      setAiLimit(limit);
    } catch (error) {
      console.error('Failed to check AI limit:', error);
    }
  };

  const getPointCost = (): number => {
    if (selectedCategory === '讚美感謝') return 0;
    if (!customText) return 1;
    if (useAiVersion && usedAi) return 5;
    if (customText) return 4;
    return 1;
  };

  const canAfford = (cost: number) => (user?.points ?? 0) >= cost;

  const handleVehicleTypeSelect = (type: VehicleType) => {
    setVehicleType(type);
    setStep('plate-input');
  };

  const handlePlateSubmit = () => {
    if (!vehicleType) return;
    // 格式化車牌（去除分隔符，統一格式）
    const formatted = normalizeLicensePlate(plateInput);
    if (!formatted) {
      toast.error('請輸入正確的車牌格式');
      return;
    }
    setTargetPlate(formatted); // 存儲格式化後的車牌（不含分隔符）
    setStep('category');
  };

  const handleCategorySelect = (category: ReminderCategory) => {
    setSelectedCategory(category);
    setSelectedSituation('');
    setGeneratedMessage('');
    setCustomText('');
    setAiSuggestion('');
    setUseAiVersion(false);
    setStep('situation');
  };

  const handleSituationSelect = (situationId: string) => {
    if (!vehicleType) return;
    setSelectedSituation(situationId);
    const message = getMessageByVehicleType(vehicleType, situationId);
    setGeneratedMessage(message);
    setStep('review');
  };

  const handleAddCustomText = async () => {
    if (!customText.trim()) {
      setStep('confirm');
      return;
    }
    if (selectedCategory === '讚美感謝') {
      setStep('confirm');
      return;
    }
    if (aiLimit.canUse && customText.trim()) {
      setIsLoading(true);
      try {
        const result = await aiApi.rewrite(customText);
        setAiSuggestion(result.rewritten);
        setUsedAi(true);
        await checkAiLimit();
        setStep('ai-suggest');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'AI 改寫失敗');
        setStep('confirm');
      } finally {
        setIsLoading(false);
      }
    } else {
      setStep('confirm');
    }
  };

  const handleConfirm = async () => {
    const cost = getPointCost();
    if (!canAfford(cost)) {
      toast.error('點數不足，請先儲值');
      router.push('/wallet');
      return;
    }

    if (!selectedCategory || !targetPlate || !generatedMessage) {
      toast.error('請完成所有步驟');
      return;
    }

    setIsLoading(true);
    try {
      // 格式化車牌（去除分隔符）
      const normalizedPlate = normalizeLicensePlate(targetPlate);
      if (!normalizedPlate) {
        toast.error('車牌號碼格式無效');
        setIsLoading(false);
        return;
      }
      
      await messagesApi.create({
        licensePlate: normalizedPlate, // 使用格式化後的車牌（不含分隔符）
        type: selectedCategory as MessageType,
        template: generatedMessage,
        customText: customText || undefined,
        useAiRewrite: usedAi,
      });
      await refreshUser();
      await refreshMessages();
      toast.success('提醒已發送');
      setStep('success');
      setTimeout(() => {
        router.push('/home');
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '發送失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'vehicle-type') {
      router.push('/home');
    } else if (step === 'plate-input') {
      setStep('vehicle-type');
    } else if (step === 'category') {
      setStep('plate-input');
    } else if (step === 'situation') {
      setStep('category');
    } else if (step === 'review') {
      setStep('situation');
    } else if (step === 'custom') {
      setStep('review');
    } else if (step === 'ai-suggest') {
      setStep('custom');
    } else if (step === 'confirm') {
      if (aiSuggestion) {
        setStep('ai-suggest');
      } else if (customText) {
        setStep('custom');
      } else {
        setStep('review');
      }
    }
  };

  if (!user) return null;

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl text-foreground mb-2">提醒已發送</h2>
            <p className="text-sm text-muted-foreground">正在返回首頁...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between relative">
          <button onClick={handleBack} className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors">
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">發送提醒</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        {step === 'vehicle-type' && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">選擇車種</h2>
              <p className="text-sm text-muted-foreground">選擇目標車輛的類型</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleVehicleTypeSelect('car')}
                className="w-full p-6 bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <Car className="h-8 w-8 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">汽車</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleVehicleTypeSelect('scooter')}
                className="w-full p-6 bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <Bike className="h-8 w-8 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">機車</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'plate-input' && vehicleType && (
          <Card className="p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl text-foreground">輸入車牌號碼</h2>
              <p className="text-sm text-muted-foreground">輸入目標車輛的車牌</p>
            </div>
            <div className="space-y-3">
              <Label htmlFor="plate">車牌號碼</Label>
              <Input
                id="plate"
                placeholder={getPlatePlaceholder(vehicleType)}
                value={plateInput}
                onChange={(e) => {
                  const formatted = formatPlateNumber(e.target.value, vehicleType);
                  setPlateInput(formatted);
                }}
                className="text-center font-mono tracking-wider"
              />
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary-dark text-white"
              onClick={handlePlateSubmit}
              disabled={!validatePlateFormat(plateInput, vehicleType)}
            >
              下一步
            </Button>
          </Card>
        )}

        {step === 'category' && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">選擇提醒類型</h2>
            </div>
            <div className="space-y-3">
              {(['車況提醒', '行車安全提醒', '讚美感謝'] as ReminderCategory[]).map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className="w-full p-4 bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-xl transition-all text-left"
                >
                  <p className="font-medium text-foreground">{category}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {category === '讚美感謝' ? '免費，可獲得1點回饋' : '消耗1點'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'situation' && vehicleType && selectedCategory && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">選擇情境</h2>
            </div>
            <div className="space-y-2">
              {getSituationsByVehicleType(vehicleType, selectedCategory).map((situation) => (
                <button
                  key={situation.id}
                  onClick={() => handleSituationSelect(situation.id)}
                  className="w-full p-4 bg-card border border-border hover:border-primary hover:bg-primary/5 rounded-lg transition-all text-left"
                >
                  <p className="text-foreground">{situation.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'review' && (
          <Card className="p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl text-foreground">預覽提醒</h2>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-foreground">{generatedMessage}</p>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full bg-primary hover:bg-primary-dark text-white"
                onClick={() => setStep('custom')}
              >
                補充說明（可選）
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep('confirm')}
              >
                直接發送
              </Button>
            </div>
          </Card>
        )}

        {step === 'custom' && (
          <Card className="p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl text-foreground">補充說明（可選）</h2>
              <p className="text-sm text-muted-foreground">最多100字，補充文字會增加點數消耗</p>
            </div>
            <div className="space-y-3">
              <Label htmlFor="customText">補充說明</Label>
              <textarea
                id="customText"
                className="flex min-h-[100px] w-full rounded-lg border border-input bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="例如：在高速公路上特別重要"
                value={customText}
                onChange={(e) => setCustomText(e.target.value.slice(0, 100))}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">
                {customText.length}/100
              </p>
              {customText && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">點數提示：</p>
                  <p className="text-sm text-foreground">
                    補充文字 +3點
                    {aiLimit.canUse && '，使用AI改寫 +1點（共+4點）'}
                  </p>
                </div>
              )}
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary-dark text-white"
              onClick={handleAddCustomText}
              disabled={isLoading}
            >
              {isLoading ? '處理中...' : '下一步'}
            </Button>
          </Card>
        )}

        {step === 'ai-suggest' && (
          <Card className="p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl text-foreground">AI 改寫建議</h2>
              <p className="text-sm text-muted-foreground">AI 已將您的文字改寫為更溫和的語氣</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">原本版本</p>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-foreground">{generatedMessage}</p>
                  {customText && <p className="text-foreground mt-2">{customText}</p>}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  AI 建議版本
                </p>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-foreground">{aiSuggestion}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full bg-primary hover:bg-primary-dark text-white"
                onClick={() => {
                  setUseAiVersion(true);
                  setStep('confirm');
                }}
              >
                使用建議版本
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setUseAiVersion(false);
                  setStep('confirm');
                }}
              >
                照原本的
              </Button>
            </div>
          </Card>
        )}

        {step === 'confirm' && (
          <Card className="p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl text-foreground">確認發送</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">目標車牌</p>
                  <p className="text-foreground font-mono">{displayLicensePlate(targetPlate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">提醒類型</p>
                  <p className="text-foreground">{selectedCategory}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">提醒內容</p>
                  <p className="text-foreground">{useAiVersion ? aiSuggestion : generatedMessage}</p>
                  {customText && !useAiVersion && (
                    <p className="text-foreground mt-2">{customText}</p>
                  )}
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">總點數消耗</span>
                  <span className="text-lg font-bold text-primary-dark">
                    {getPointCost()} 點
                  </span>
                </div>
                {!canAfford(getPointCost()) && (
                  <p className="text-xs text-destructive mt-2">點數不足，請先儲值</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full bg-primary hover:bg-primary-dark text-white"
                onClick={handleConfirm}
                disabled={!canAfford(getPointCost()) || isLoading}
              >
                {isLoading ? '發送中...' : '確認發送'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/home')}
              >
                取消
              </Button>
            </div>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
});

SendPage.displayName = 'SendPage';

export default SendPage;
