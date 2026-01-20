'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Car, Bike, AlertCircle, Sparkles, AlertTriangle, ThumbsUp, HelpCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/layout/BottomNav';
import {
  VehicleType,
  getSituationsByVehicleType,
  getMessageByVehicleType,
  formatPlateNumber,
  validatePlateFormat,
  getPlatePlaceholder,
  getVehicleTypeName,
} from '@/data/vehicleTemplates';
import { messagesApi, aiApi } from '@/lib/api-services';
import type { MessageType } from '@/types';
import { normalizeLicensePlate, displayLicensePlate } from '@/lib/license-plate-format';

type ReminderCategory = '車況提醒' | '行車安全' | '讚美感謝' | '其他情況';
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
    // 其他讚美：有文字用AI改寫2點，不用AI 4點
    if (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise') {
      if (useAiVersion && usedAi) return 2;
      if (customText) return 4;
      return 0;
    }
    // 其他讚美選項：直接送出0點
    if (selectedCategory === '讚美感謝') return 0;
    if (selectedCategory === '其他情況') {
      return customText ? 2 : 4; // 其他情況：有文字用AI改寫2點，沒文字4點
    }
    if (!customText) return 1; // 只用系統生成
    if (useAiVersion && usedAi) return 2; // 補充文字 + AI
    return 4; // 補充文字 + 不用AI
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
    setUsedAi(false);
    
    if (category === '其他情況') {
      setStep('custom'); // 直接進補充文字
    } else {
      setStep('situation'); // 進情境選擇
    }
  };

  const handleSituationSelect = (situationId: string) => {
    if (!vehicleType) return;
    setSelectedSituation(situationId);
    
    // 其他讚美：直接進入輸入界面，不顯示模板訊息
    if (selectedCategory === '讚美感謝' && situationId === 'other-praise') {
      setGeneratedMessage(''); // 不設置模板訊息
      setStep('custom');
      return;
    }
    
    const message = getMessageByVehicleType(vehicleType, situationId);
    setGeneratedMessage(message);
    setStep('review');
  };

  const handleAddCustomText = async () => {
    if (!customText.trim()) {
      setStep('confirm');
      return;
    }

    // 驗證字數（5-30字）
    if (customText.trim().length < 5) {
      toast.error('補充文字至少需要 5 個字');
      return;
    }

    // 其他讚美可以使用AI，其他讚美選項直接送出
    if (selectedCategory === '讚美感謝' && selectedSituation !== 'other-praise') {
      setStep('confirm');
      return;
    }

    // 有補充文字 → 進AI建議（AI改寫是固定功能）
    if (aiLimit.canUse && customText.trim()) {
      setIsLoading(true);
      try {
        // 對於"其他情況"和"其他讚美"，只改寫補充文字；對於其他分類，改寫系統生成+補充文字
        const textToRewrite = (selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise'))
          ? customText 
          : `${generatedMessage} ${customText}`;
        const result = await aiApi.rewrite(textToRewrite, vehicleType || undefined, selectedCategory || undefined);
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

    if (!selectedCategory || !targetPlate) {
      toast.error('請完成所有步驟');
      return;
    }

    // "其他情況"和"其他讚美"不需要 generatedMessage，只需要 customText
    const isOtherCase = selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise');
    if (!isOtherCase && !generatedMessage) {
      toast.error('請完成所有步驟');
      return;
    }

    // "其他情況"和"其他讚美"必須有 customText，且字數符合要求
    if (isOtherCase) {
      if (!customText.trim()) {
        toast.error('請輸入說明內容');
        return;
      }
      if (customText.trim().length < 5) {
        toast.error('說明內容至少需要 5 個字');
        return;
      }
    }

    // 如果有補充文字，驗證字數
    if (customText.trim() && customText.trim().length < 5) {
      toast.error('補充文字至少需要 5 個字');
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
        type: selectedCategory === '其他情況' ? '行車安全提醒' : (selectedCategory === '行車安全' ? '行車安全提醒' : (selectedCategory as MessageType)),
        template: isOtherCase ? customText : (generatedMessage || customText), // "其他情況"和"其他讚美"使用 customText 作為 template
        customText: isOtherCase ? undefined : (customText || undefined),
        useAiRewrite: usedAi,
      });
      await refreshUser();
      await refreshMessages();
      toast.success('提醒已發送');
      setStep('success');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '發送失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const stepFlow: Record<SendStep, SendStep | null> = {
      'vehicle-type': null,
      'plate-input': 'vehicle-type',
      'category': 'plate-input',
      'situation': 'category',
      'review': 'situation',
      'custom': selectedCategory === '其他情況' 
        ? 'category' 
        : (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise')
          ? 'situation'
          : 'review',
      'ai-suggest': 'custom',
      'confirm': aiSuggestion ? 'ai-suggest' : (customText ? 'custom' : 'review'),
      'success': null,
    };

    const prevStep = stepFlow[step];
    if (prevStep) {
      setStep(prevStep);
    } else if (step === 'vehicle-type') {
      router.push('/home');
    }
  };

  // 🔄 重置所有狀態
  const resetAll = () => {
    setStep('vehicle-type');
    setVehicleType(null);
    setTargetPlate('');
    setPlateInput('');
    setSelectedCategory(null);
    setSelectedSituation('');
    setGeneratedMessage('');
    setCustomText('');
    setAiSuggestion('');
    setUseAiVersion(false);
    setUsedAi(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header - 符合設計規範 */}
      <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={step === 'success' ? () => router.push('/home') : handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">{step === 'success' ? '完成' : '返回'}</span>
          </button>
          <h1 className="font-medium text-foreground">發送提醒</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 🎯 Send_00：選擇車種 */}
        {step === 'vehicle-type' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">對方是什麼車種？</h2>
              <p className="text-sm text-muted-foreground">先選擇車種，提醒會更精準</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 🚗 汽車 */}
              <button
                onClick={() => handleVehicleTypeSelect('car')}
                className="aspect-square bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl p-6 transition-all active:scale-95"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Car className="h-16 w-16 text-[#4A6FA5]" strokeWidth={1.5} />
                  <span className="text-lg font-medium text-foreground">汽車</span>
                </div>
              </button>

              {/* 🛵 機車 */}
              <button
                onClick={() => handleVehicleTypeSelect('scooter')}
                className="aspect-square bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl p-6 transition-all active:scale-95"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Bike className="h-16 w-16 text-[#4A6FA5]" strokeWidth={1.5} />
                  <span className="text-lg font-medium text-foreground">機車</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 🎯 Send_01：輸入車牌 */}
        {step === 'plate-input' && vehicleType && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">請輸入對方的車牌號碼</h2>
              <p className="text-sm text-muted-foreground">這樣才能把提醒送給對方</p>
            </div>

            {/* 車種顯示卡片 */}
            <Card className="p-4 bg-primary/5 border-primary/30">
              <div className="flex items-center justify-center gap-2">
                {vehicleType === 'car' ? (
                  <Car className="h-5 w-5 text-primary" />
                ) : (
                  <Bike className="h-5 w-5 text-primary" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {getVehicleTypeName(vehicleType)}
                </span>
              </div>
            </Card>

            {/* 車牌輸入 */}
            <div className="space-y-2">
              <Label htmlFor="plate" className="text-sm text-muted-foreground">
                車牌號碼
              </Label>
              <Input
                id="plate"
                value={plateInput}
                onChange={(e) => {
                  const formatted = formatPlateNumber(e.target.value, vehicleType);
                  setPlateInput(formatted);
                }}
                placeholder={getPlatePlaceholder(vehicleType)}
                className="h-14 text-center text-lg font-mono tracking-wider"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground text-center">
                僅用於投遞提醒，不會公開顯示
              </p>
            </div>

            {/* 下一步按鈕 */}
            <button
              onClick={handlePlateSubmit}
              disabled={!plateInput || plateInput.length < 4}
              className="w-full h-12 bg-[#4A6FA5] hover:bg-[#3C5E8C] text-white rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一步
            </button>
          </div>
        )}

        {/* 🎯 Send_02：選擇情境分類 */}
        {step === 'category' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">選擇情境</h2>
              <p className="text-sm text-muted-foreground">你要提醒什麼？</p>
            </div>

            {/* 車種與車牌提示卡片 */}
            <Card className="p-3 bg-muted/30 border-border">
              <div className="flex items-center justify-center gap-2 text-sm">
                {vehicleType === 'car' ? (
                  <Car className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Bike className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-muted-foreground">
                  對象：{getVehicleTypeName(vehicleType!)} {displayLicensePlate(targetPlate)}
                </span>
              </div>
            </Card>

            {/* 分類選擇卡片（2x2 Grid） */}
            <div className="grid grid-cols-2 gap-4">
              {/* 車況提醒 */}
              <button
                onClick={() => handleCategorySelect('車況提醒')}
                className="aspect-square bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl p-6 transition-all active:scale-95"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  {vehicleType === 'car' ? (
                    <Car className="h-12 w-12 text-[#7A8FA8]" strokeWidth={1.5} />
                  ) : (
                    <Bike className="h-12 w-12 text-[#7A8FA8]" strokeWidth={1.5} />
                  )}
                  <span className="font-medium text-foreground">車況提醒</span>
                </div>
              </button>

              {/* 行車安全 */}
              <button
                onClick={() => handleCategorySelect('行車安全')}
                className="aspect-square bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl p-6 transition-all active:scale-95"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <AlertTriangle className="h-12 w-12 text-[#E6A23C]" strokeWidth={1.5} />
                  <span className="font-medium text-foreground">行車安全</span>
                </div>
              </button>

              {/* 讚美感謝 */}
              <button
                onClick={() => handleCategorySelect('讚美感謝')}
                className="aspect-square bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl p-6 transition-all active:scale-95"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <ThumbsUp className="h-12 w-12 text-[#8FA6BF]" strokeWidth={1.5} />
                  <span className="font-medium text-foreground">讚美感謝</span>
                </div>
              </button>

              {/* 其他情況 */}
              <button
                onClick={() => handleCategorySelect('其他情況')}
                className="aspect-square bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl p-6 transition-all active:scale-95"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <HelpCircle className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
                  <span className="font-medium text-foreground">其他情況</span>
                </div>
              </button>
            </div>

            {/* 點數說明卡片 */}
            <Card className="p-4 bg-muted/30 border-border">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">車況/安全（系統模板）</span>
                  <span className="font-medium tabular-nums">1 點</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">補充文字（AI協助）</span>
                  <span className="font-medium tabular-nums">2 點</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">補充文字（不用AI）</span>
                  <span className="font-medium tabular-nums">4 點</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">讚美感謝</span>
                  <span className="font-medium text-secondary">免費</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 🎯 Send_03：選擇具體情境 */}
        {step === 'situation' && selectedCategory && selectedCategory !== '其他情況' && vehicleType && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">
                {selectedCategory === '車況提醒' && '你要提醒的是？'}
                {selectedCategory === '行車安全' && '你要提醒的是？'}
                {selectedCategory === '讚美感謝' && '你想表達的是？'}
              </h2>
              <p className="text-sm text-muted-foreground">選一個最接近的情況</p>
            </div>

            {/* 車種與分類提示卡片 */}
            <Card className="p-3 bg-muted/30 border-border">
              <div className="flex items-center justify-center gap-2 text-sm">
                {vehicleType === 'car' ? (
                  <Car className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Bike className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-muted-foreground">
                  {getVehicleTypeName(vehicleType)} - {selectedCategory}
                </span>
              </div>
            </Card>

            {/* 動態 Chips（根據車種） */}
            <div className="grid grid-cols-2 gap-3">
              {getSituationsByVehicleType(vehicleType, selectedCategory).map((situation) => (
                <button
                  key={situation.id}
                  onClick={() => handleSituationSelect(situation.id)}
                  className={`
                    px-4 py-4 rounded-xl border-2 transition-all text-sm font-medium
                    ${selectedSituation === situation.id
                      ? 'bg-primary/5 border-primary text-foreground'
                      : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5'
                    }
                    active:scale-95
                  `}
                >
                  {situation.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 🎯 Send_04：系統生成內容預覽 */}
        {step === 'review' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">系統已生成</h2>
              <p className="text-sm text-muted-foreground">
                {selectedCategory === '讚美感謝' ? '預設使用這個訊息（免費）' : '預設使用這個訊息（1點）'}
              </p>
            </div>

            {/* 車種 + 分類提示 */}
            <Card className="p-3 bg-muted/30 border-border">
              <div className="flex items-center justify-center gap-2 text-sm">
                {vehicleType === 'car' ? (
                  <Car className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Bike className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-muted-foreground">
                  {getVehicleTypeName(vehicleType!)} - {selectedCategory}
                </span>
              </div>
            </Card>

            {/* 系統生成的訊息 */}
            <Card className="p-5 bg-muted/30 border-border">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-foreground leading-relaxed">{generatedMessage}</p>
              </div>
            </Card>

            {/* 操作按鈕 */}
            <div className="space-y-3">
              {selectedCategory === '讚美感謝' ? (
                // 讚美感謝：直接送出，不顯示補充按鈕
                <button
                  onClick={() => setStep('confirm')}
                  className="w-full h-12 bg-[#4A6FA5] hover:bg-[#3C5E8C] text-white rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium"
                >
                  直接送出（免費）
                </button>
              ) : (
                // 其他分類：顯示點數和補充按鈕
                <>
                  {canAfford(1) ? (
                    <button
                      onClick={() => setStep('confirm')}
                      className="w-full h-12 bg-[#4A6FA5] hover:bg-[#3C5E8C] text-white rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium"
                    >
                      直接送出（1 點）
                    </button>
                  ) : (
                    <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium text-destructive">點數不足</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        目前剩餘 {user?.points ?? 0} 點，需要 1 點才能發送
                      </p>
                      <Button
                        size="sm"
                        className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
                        onClick={() => router.push('/wallet')}
                      >
                        去儲值
                      </Button>
                    </div>
                  )}

                  <button
                    onClick={() => setStep('custom')}
                    className="w-full h-12 bg-card border-2 border-border hover:border-primary text-foreground rounded-xl transition-all active:scale-[0.98] font-medium"
                  >
                    想補充一句
                  </button>
                </>
              )}
            </div>

            {/* 點數說明 */}
            <Card className="p-4 bg-muted/30 border-border">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">只用系統生成</span>
                  <span className="font-medium tabular-nums">1 點</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">補充文字（AI協助）</span>
                  <span className="font-medium tabular-nums">2 點</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">補充文字（不用AI）</span>
                  <span className="font-medium tabular-nums">4 點</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 🎯 Send_05：補充文字 */}
        {step === 'custom' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">
                {selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise')
                  ? '請簡單說明'
                  : '想補充一句'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise')
                  ? '5-30字'
                  : '可選，5-30字'}
              </p>
            </div>

            {/* 顯示系統生成（如果有） */}
            {generatedMessage && selectedCategory !== '其他情況' && !(selectedCategory === '讚美感謝' && selectedSituation === 'other-praise') && (
              <Card className="p-4 bg-muted/30 border-border">
                <div className="text-sm">
                  <div className="text-muted-foreground mb-2">系統生成</div>
                  <p className="text-foreground">{generatedMessage}</p>
                </div>
              </Card>
            )}

            {/* 補充文字輸入 */}
            <div className="space-y-2">
              <Label htmlFor="custom-text" className="text-sm text-muted-foreground">
                {selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise')
                  ? '說明內容'
                  : '補充說明'}
              </Label>
              <div className="relative">
                <Input
                  id="custom-text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value.slice(0, 30))}
                  placeholder={selectedCategory === '其他情況' ? '例如：擋到出口了' : '例如：快到學校了'}
                  className="pr-12 h-11"
                  maxLength={30}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums ${
                  customText.length < 5 && customText.length > 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {customText.length}/30
                </span>
              </div>
            </div>

            {/* AI 使用次數提示 */}
            {(selectedCategory !== '讚美感謝' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise')) && customText.trim() && (
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
              {/* 沒有補充文字 - 直接送出 */}
              {!customText.trim() ? (
                <button
                  onClick={handleAddCustomText}
                  className="w-full h-12 bg-[#4A6FA5] hover:bg-[#3C5E8C] text-white rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium"
                >
                  直接送出
                </button>
              ) : customText.trim().length < 5 ? (
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">字數不足</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    補充文字至少需要 5 個字
                  </p>
                </div>
              ) : (
                /* 有補充文字 - 兩個選項 */
                <>
                  {/* AI 協助改寫 */}
                  {(selectedCategory !== '讚美感謝' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise')) && (
                    aiLimit.canUse ? (
                      <button
                        onClick={() => {
                          if (aiLimit.canUse && customText.trim()) {
                            handleAddCustomText();
                          } else {
                            toast.error('AI 使用次數已達今日上限');
                          }
                        }}
                        disabled={isLoading}
                        className="w-full h-12 bg-[#4A6FA5] hover:bg-[#3C5E8C] text-white rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium disabled:opacity-50"
                      >
                        {isLoading ? '處理中...' : `AI 協助改寫（剩 ${aiLimit.remaining} 次）`}
                      </button>
                    ) : (
                      <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium text-destructive">AI 已達今日上限</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          每日限制 5 次，明天會自動重置
                        </p>
                      </div>
                    )
                  )}

                  {/* 不用 AI，直接送出 */}
                  <button
                    onClick={() => {
                      setStep('confirm');
                    }}
                    className="w-full h-12 bg-card border-2 border-border hover:border-primary text-foreground rounded-xl transition-all active:scale-[0.98] font-medium"
                  >
                    不用 AI，直接送出（{selectedCategory === '讚美感謝' && selectedSituation === 'other-praise' ? '4' : '4'} 點）
                  </button>
                </>
              )}

              {selectedCategory !== '其他情況' && !(selectedCategory === '讚美感謝' && selectedSituation === 'other-praise') && (
                <button
                  onClick={() => setStep('review')}
                  className="w-full h-12 bg-card border-2 border-border hover:border-primary text-foreground rounded-xl transition-all active:scale-[0.98] font-medium"
                >
                  返回
                </button>
              )}
            </div>

            {/* 點數說明 */}
            {customText && (
              <Card className="p-4 bg-muted/30 border-border">
                <div className="space-y-2 text-sm">
                  {(selectedCategory !== '讚美感謝' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise')) && aiLimit.canUse && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">使用 AI 協助</span>
                      <span className="font-medium tabular-nums">2 點</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">不使用 AI</span>
                    <span className="font-medium tabular-nums">4 點</span>
                  </div>
                  {(selectedCategory !== '讚美感謝' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise')) && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        💡 AI 協助每日限制 5 次，今日剩餘 {aiLimit.remaining} 次
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* 🎯 Send_06：AI 建議版本 */}
        {step === 'ai-suggest' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">AI 建議版本</h2>
              <p className="text-sm text-muted-foreground">這樣說會更清楚</p>
            </div>

            {/* 原版（灰色顯示） */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">原本的版本</div>
              <Card className="p-4 bg-muted/30 border-border">
                <p className="text-sm text-muted-foreground line-through">
                  {(selectedCategory === '讚美感謝' && selectedSituation === 'other-praise') || selectedCategory === '其他情況'
                    ? customText
                    : <>
                        {generatedMessage}
                        {customText && <><br />{customText}</>}
                      </>
                  }
                </p>
              </Card>
            </div>

            {/* AI 建議版 */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">AI 建議版本</div>
              <Card className="p-4 bg-primary/5 border-primary/30">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-foreground leading-relaxed">{aiSuggestion}</p>
                </div>
              </Card>
            </div>

            {/* 操作按鈕 */}
            <div className="space-y-3">
              {canAfford(2) ? (
                <button
                  onClick={() => {
                    setUseAiVersion(true);
                    setStep('confirm');
                  }}
                  className="w-full h-12 bg-[#4A6FA5] hover:bg-[#3C5E8C] text-white rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium"
                >
                  用建議版送（2 點）
                </button>
              ) : (
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">點數不足</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    目前剩餘 {user?.points ?? 0} 點，使用 AI 協助需要 2 點
                  </p>
                  <Button
                    size="sm"
                    className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
                    onClick={() => router.push('/wallet')}
                  >
                    去儲值
                  </Button>
                </div>
              )}

              {canAfford(4) ? (
                <button
                  onClick={() => {
                    setUseAiVersion(false);
                    setStep('confirm');
                  }}
                  className="w-full h-12 bg-card border-2 border-border hover:border-primary text-foreground rounded-xl transition-all active:scale-[0.98] font-medium"
                >
                  用原版送出（4 點）
                </button>
              ) : (
                <div className="p-4 bg-muted/30 border border-border rounded-xl">
                  <p className="text-xs text-muted-foreground text-center">
                    原版需要 4 點（點數不足）
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🎯 Send_07：確認送出 */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">確認送出</h2>
              <p className="text-sm text-muted-foreground">檢查一下內容</p>
            </div>

            {/* 車種 + 車牌 */}
            <Card className="p-3 bg-muted/30 border-border">
              <div className="flex items-center justify-center gap-2 text-sm">
                {vehicleType === 'car' ? (
                  <Car className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Bike className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-muted-foreground">
                  {getVehicleTypeName(vehicleType!)} {displayLicensePlate(targetPlate)}
                </span>
              </div>
            </Card>

            {/* 最終訊息預覽 */}
            <Card className="p-5 bg-card border-border">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedCategory}
                  </span>
                </div>
                <p className="text-foreground leading-relaxed whitespace-pre-line">
                  {useAiVersion 
                    ? aiSuggestion 
                    : selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise')
                      ? customText
                      : (customText ? `${generatedMessage}\n${customText}` : generatedMessage)
                  }
                </p>
              </div>
            </Card>

            {/* 點數成本 */}
            <Card className="p-4 bg-muted/30 border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">本次消耗</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#3C5E8C] tabular-nums">{getPointCost()}</span>
                  <span className="text-sm text-muted-foreground">點</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">送出後剩餘</span>
                <span className="font-medium tabular-nums">{(user?.points ?? 0) - getPointCost()} 點</span>
              </div>
            </Card>

            {/* 操作按鈕 */}
            <div className="space-y-3">
              {canAfford(getPointCost()) ? (
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="w-full h-12 bg-[#4A6FA5] hover:bg-[#3C5E8C] text-white rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium disabled:opacity-50"
                >
                  {isLoading ? '發送中...' : '確認送出'}
                </button>
              ) : (
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">點數不足</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    目前剩餘 {user?.points ?? 0} 點，需要 {getPointCost()} 點才能發送
                  </p>
                  <Button
                    size="sm"
                    className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
                    onClick={() => router.push('/wallet')}
                  >
                    去儲值
                  </Button>
                </div>
              )}

              <button
                onClick={handleBack}
                className="w-full h-12 bg-card border-2 border-border hover:border-primary text-foreground rounded-xl transition-all active:scale-[0.98] font-medium"
              >
                返回修改
              </button>
            </div>
          </div>
        )}

        {/* 🎯 Send_08：送出成功 */}
        {step === 'success' && (
          <div className="space-y-6 text-center py-12">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center">
                <Check className="h-10 w-10 text-secondary" strokeWidth={2.5} />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-medium mb-2">提醒已送出</h2>
              <p className="text-muted-foreground">
                已成功送出給「{getVehicleTypeName(vehicleType!)}」車主
              </p>
            </div>

            <Card className="p-4 bg-muted/30 border-border">
              <div className="text-sm space-y-1">
                <div className="text-muted-foreground">剩餘點數</div>
                <div className="text-3xl font-bold text-[#3C5E8C] tabular-nums">{user?.points ?? 0}</div>
              </div>
            </Card>

            <div className="space-y-3 pt-6">
              <button
                onClick={() => router.push('/home')}
                className="w-full h-12 bg-[#4A6FA5] hover:bg-[#3C5E8C] text-white rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium"
              >
                返回首頁
              </button>
              <button
                onClick={resetAll}
                className="w-full h-12 bg-card border-2 border-border hover:border-primary text-foreground rounded-xl transition-all active:scale-[0.98] font-medium"
              >
                繼續發送
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
});

SendPage.displayName = 'SendPage';

export default SendPage;
