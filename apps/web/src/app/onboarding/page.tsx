'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Car, Bike, User, ChevronLeft, Upload, X, Image as ImageIcon, Gift, Check } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi, licensePlateApi, uploadApi, inviteApi } from '@/lib/api-services';
import type { UserType, ValidateCodeResponse } from '@/types';
import { normalizeLicensePlate, displayLicensePlate } from '@/lib/license-plate-format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

const OnboardingPage = React.memo(() => {
  const router = useRouter();
  const { user, refreshUser } = useApp();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [vehicleType, setVehicleType] = useState<'car' | 'scooter' | null>(null);
  const [nickname, setNickname] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLicensePlateDialog, setShowLicensePlateDialog] = useState(false);
  const [licensePlateCheckResult, setLicensePlateCheckResult] = useState<{
    isBound: boolean;
    authProvider?: 'apple' | 'line';
  } | null>(null);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [licenseImage, setLicenseImage] = useState<string>('');
  const [licenseImageFile, setLicenseImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [applicationEmail, setApplicationEmail] = useState<string>('');

  // Invite code state
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inviteCodeValidation, setInviteCodeValidation] = useState<ValidateCodeResponse | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [inviteCodeApplied, setInviteCodeApplied] = useState(false);

  const handleUserTypeSelect = (type: UserType, vehicle?: 'car' | 'scooter') => {
    setUserType(type);
    if (vehicle) {
      setVehicleType(vehicle);
    }
    setStep(2);
  };

  // Validate invite code
  const handleValidateInviteCode = async (code: string) => {
    if (code.length < 6) {
      setInviteCodeValidation(null);
      return;
    }

    setIsValidatingCode(true);
    try {
      const result = await inviteApi.validateCode(code);
      setInviteCodeValidation(result);
    } catch (error) {
      setInviteCodeValidation({ valid: false, message: '驗證失敗' });
    } finally {
      setIsValidatingCode(false);
    }
  };

  // Apply invite code and continue
  const handleApplyInviteCode = async () => {
    if (!inviteCodeValidation?.valid || !inviteCode) return;

    setIsLoading(true);
    try {
      await inviteApi.applyCode(inviteCode);
      setInviteCodeApplied(true);
      toast.success('邀請碼已套用！完成註冊後你和邀請人各得 10 點');
      setStep(3); // Go to nickname step
    } catch (error: any) {
      toast.error(error.response?.data?.message || '使用邀請碼失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // Skip invite code step
  const handleSkipInviteCode = () => {
    setStep(3); // Go to nickname step
  };

  const handleNicknameSubmit = async () => {
    if (nickname.trim()) {
      try {
        await usersApi.updateMe({ nickname: nickname.trim() });
        await refreshUser();
      } catch (error) {
        console.error('Failed to update nickname:', error);
      }
    }

    if (userType === 'pedestrian') {
      setStep(5); // Points explanation step
    } else {
      setStep(4); // License plate step for drivers
    }
  };

  const handleLicensePlateSubmit = async () => {
    if (!licensePlate) return;

    // 格式化車牌（去除分隔符）
    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!normalizedPlate) {
      toast.error('車牌號碼格式無效');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 檢查車牌是否可用
      const checkResult = await licensePlateApi.checkAvailability(normalizedPlate);
      
      if (checkResult.isBound) {
        // 車牌已被綁定，顯示警示對話框
        setLicensePlateCheckResult({
          isBound: true,
          authProvider: checkResult.authProvider,
        });
        setShowLicensePlateDialog(true);
        setIsLoading(false);
        return;
      }

      // 車牌可用，繼續流程
      try {
        await usersApi.updateMe({ licensePlate: normalizedPlate });
        await refreshUser();
      } catch (error) {
        console.error('Failed to update license plate:', error);
      }
      setStep(5); // Go to points explanation step
    } catch (error: any) {
      toast.error(error.response?.data?.message || '檢查車牌失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmApplication = () => {
    setShowLicensePlateDialog(false);
    setShowApplicationDialog(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 檢查檔案類型
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('只允許上傳圖片檔案（JPG、PNG、GIF、WebP）');
      return;
    }

    // 檢查檔案大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('檔案大小不能超過 10MB');
      return;
    }

    setLicenseImageFile(file);
    setIsUploading(true);

    try {
      const result = await uploadApi.uploadImage(file);
      setLicenseImage(result.url);
      toast.success('圖片上傳成功');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '圖片上傳失敗');
      setLicenseImageFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setLicenseImageFile(null);
    setLicenseImage('');
  };

  const handleSubmitApplication = async () => {
    if (!licensePlate) return;

    setIsLoading(true);
    try {
      // 格式化車牌（去除分隔符）
      const normalizedPlate = normalizeLicensePlate(licensePlate);
      if (!normalizedPlate) {
        toast.error('車牌號碼格式無效');
        setIsLoading(false);
        return;
      }
      
      await licensePlateApi.createApplication({
        licensePlate: normalizedPlate,
        vehicleType: vehicleType || undefined,
        licenseImage: licenseImage || undefined,
        email: applicationEmail || undefined,
      });
      toast.success('申請已提交，我們會在 1-2 個工作天內以 Email 通知');
      setShowApplicationDialog(false);
      // 跳過車牌步驟，繼續完成註冊（不綁定車牌）
      setStep(5); // Go to points explanation step
    } catch (error: any) {
      toast.error(error.response?.data?.message || '提交申請失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!userType) return;

    setIsLoading(true);
    try {
      // 格式化車牌（如果提供）
      const normalizedPlate = licensePlate ? normalizeLicensePlate(licensePlate) : undefined;
      if (licensePlate && !normalizedPlate) {
        toast.error('車牌號碼格式無效');
        setIsLoading(false);
        return;
      }
      
      await usersApi.completeOnboarding({
        userType,
        vehicleType: vehicleType || undefined,
        licensePlate: normalizedPlate || undefined,
        nickname: nickname || undefined,
      });
      await refreshUser();
      toast.success('註冊完成！');
      router.push('/home');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '完成註冊失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      router.push('/login');
    } else if (step === 2) {
      // Invite code step -> User type selection
      setStep(1);
    } else if (step === 3) {
      // Nickname step -> Invite code step
      setStep(2);
    } else if (step === 4) {
      // License plate step -> Nickname step
      setStep(3);
    } else if (step === 5) {
      // Points explanation step
      if (userType === 'pedestrian') {
        setStep(3); // Back to nickname
      } else {
        setStep(4); // Back to license plate
      }
    } else if (step === 6) {
      // Welcome step -> Points explanation
      setStep(5);
    }
  };

  // Total steps: Drivers: 6 (user type, invite, nickname, plate, points, welcome)
  // Pedestrians: 5 (user type, invite, nickname, points, welcome - skip license plate)
  const totalSteps = userType === 'pedestrian' ? 5 : 6;

  // Calculate display step for pedestrians (skip the license plate step 4)
  const getDisplayStep = () => {
    if (userType === 'pedestrian') {
      // Steps 1-3 are the same, but step 5 should display as 4, step 6 as 5
      if (step <= 3) return step;
      return step - 1;
    }
    return step;
  };
  const currentStep = getDisplayStep();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between relative">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">註冊流程 ({currentStep}/{totalSteps})</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-6">
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === currentStep
                  ? 'w-8 bg-primary'
                  : s < currentStep
                  ? 'w-1.5 bg-primary/30'
                  : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">你今天是用什麼方式在路上？</h2>
              <p className="text-sm text-muted-foreground">不同身分，能使用的功能會不一樣</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleUserTypeSelect('driver', 'car')}
                className="w-full p-6 bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl transition-all active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <Car className="h-8 w-8 text-primary" strokeWidth={1.5} />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">汽車駕駛</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      填寫車牌｜可以發送，也可以接收提醒
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleUserTypeSelect('driver', 'scooter')}
                className="w-full p-6 bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl transition-all active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <Bike className="h-8 w-8 text-primary" strokeWidth={1.5} />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">機車騎士</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      填寫車牌｜可以發送，也可以接收提醒
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleUserTypeSelect('pedestrian')}
                className="w-full p-6 bg-card border-2 border-border hover:border-primary hover:bg-primary/5 rounded-2xl transition-all active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <User className="h-8 w-8 text-primary" strokeWidth={1.5} />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">行人 / 腳踏車</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      不需車牌｜只能發送提醒
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <Card className="p-4 bg-muted/30 border-border">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                💡 行人 / 腳踏車沒有車牌，因此不會收到別人的提醒
              </p>
            </Card>
          </div>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-6 bg-card border-border shadow-none">
            <div className="space-y-3 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full mx-auto flex items-center justify-center mb-2">
                <Gift className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl text-foreground">有邀請碼嗎？</h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full">
                <span className="text-sm font-medium text-primary">輸入邀請碼，你我各得 10 點！</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="inviteCode" className="text-sm text-foreground">
                邀請碼
              </Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="輸入邀請碼或車牌"
                value={inviteCode}
                onChange={(e) => {
                  const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  if (cleaned.length <= 8) {
                    setInviteCode(cleaned);
                    if (cleaned.length >= 6) {
                      handleValidateInviteCode(cleaned);
                    } else {
                      setInviteCodeValidation(null);
                    }
                  }
                }}
                maxLength={8}
                className="text-center font-mono text-xl tracking-[0.5em] h-14"
              />

              {/* Validation feedback */}
              {isValidatingCode && (
                <p className="text-xs text-muted-foreground text-center">驗證中...</p>
              )}
              {inviteCodeValidation && inviteCodeValidation.valid && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">
                      來自「{inviteCodeValidation.inviterNickname}」的邀請
                    </p>
                    <p className="text-xs text-green-600">
                      完成註冊後，你和邀請人各得 10 點
                    </p>
                  </div>
                </div>
              )}
              {inviteCodeValidation && !inviteCodeValidation.valid && (
                <p className="text-xs text-red-500 text-center">
                  {inviteCodeValidation.message || '無效的邀請碼'}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {inviteCodeValidation?.valid ? (
                <Button
                  className="w-full h-12 bg-primary hover:bg-primary-dark text-white text-base"
                  onClick={handleApplyInviteCode}
                  disabled={isLoading}
                >
                  {isLoading ? '處理中...' : '使用邀請碼，一起賺點數！'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-11 border-border"
                  onClick={handleSkipInviteCode}
                >
                  沒有邀請碼，跳過此步驟
                </Button>
              )}
              {inviteCodeValidation?.valid && (
                <button
                  onClick={handleSkipInviteCode}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  不使用邀請碼
                </button>
              )}
            </div>
          </Card>
        )}

        {step === 3 && (
            <Card className="p-6 space-y-6 bg-card border-border shadow-none">
            <div className="space-y-3 text-center">
              <h2 className="text-xl text-foreground">設定一個暱稱（可跳過）</h2>
              <p className="text-sm text-muted-foreground">
                暱稱只會以匿名方式顯示<br />
                不設定也能完整使用所有功能
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="nickname" className="text-sm text-foreground">
                暱稱
              </Label>
              <Input
                id="nickname"
                type="text"
                placeholder="例如：熱心駕駛、路過提醒一下"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
              />
              <p className="text-xs text-muted-foreground">最多 12 個字</p>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
                onClick={handleNicknameSubmit}
              >
                {nickname.trim() ? '設定暱稱並繼續' : '跳過'}
              </Button>
              {nickname.trim() && (
                <button
                  onClick={() => {
                    setNickname('');
                    handleNicknameSubmit();
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  跳過
                </button>
              )}
            </div>
          </Card>
        )}

        {step === 4 && userType === 'driver' && (
            <Card className="p-6 space-y-6 bg-card border-border shadow-none">
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                {vehicleType === 'car' ? (
                  <Car className="h-6 w-6 text-primary" strokeWidth={1.5} />
                ) : (
                  <Bike className="h-6 w-6 text-primary" strokeWidth={1.5} />
                )}
                <span className="text-sm font-medium text-primary">
                  {vehicleType === 'car' ? '汽車駕駛' : '機車騎士'}
                </span>
              </div>
              <h2 className="text-xl text-foreground">填寫你的車牌</h2>
              <p className="text-sm text-muted-foreground">
                只用來接收提醒<br />
                不會公開、不會被其他人看到
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="licensePlate" className="text-sm text-foreground">
                {vehicleType === 'car' ? '汽車車牌' : '機車車牌'}
              </Label>
              <Input
                id="licensePlate"
                type="text"
                placeholder={vehicleType === 'car' ? 'ABC1234' : 'ABC123'}
                value={licensePlate}
                onChange={(e) => {
                  // 只去除非字母數字字符，不添加分隔符（用戶不喜歡輸入分隔符）
                  const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setLicensePlate(cleaned);
                }}
                maxLength={8}
                className="text-center font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground text-center">
                {vehicleType === 'car' ? '格式範例：ABC1234 或 ABC-1234（可不輸入連字符）' : '格式範例：ABC123 或 ABC-123（可不輸入連字符）'}
              </p>
            </div>

            <Button
              className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
              onClick={handleLicensePlateSubmit}
              disabled={!licensePlate}
            >
              下一步
            </Button>
          </Card>
        )}

        {step === 5 && (
          <Card className="p-6 space-y-6 bg-card border-border shadow-none">
            <div className="space-y-4 text-center">
              <h2 className="text-xl text-foreground">
                每一次提醒<br />都需要一點點點數
              </h2>

              <div className="space-y-2 text-sm text-left bg-muted/50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground">📩</span>
                  <span className="text-foreground">發送提醒會消耗點數</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground">👍</span>
                  <span className="text-foreground">收到讚美，可以獲得少量點數</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground">🔒</span>
                  <span className="text-foreground">車牌與個人資訊都不會公開</span>
                </div>
              </div>

              <div className="bg-primary/5 border-2 border-primary/30 rounded-lg p-4">
                <p className="text-sm font-medium text-primary-dark">
                  🎁 每天免費 2 點，用完隔天自動補滿
                </p>
              </div>
            </div>

            <Button
              className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
              onClick={() => setStep(6)}
            >
              下一步
            </Button>
          </Card>
        )}

        {step === 6 && (
          <Card className="p-6 space-y-6 bg-card border-border shadow-none">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center">
                {userType === 'pedestrian' ? (
                  <User className="h-8 w-8 text-primary" />
                ) : vehicleType === 'car' ? (
                  <Car className="h-8 w-8 text-primary" />
                ) : (
                  <Bike className="h-8 w-8 text-primary" />
                )}
              </div>

              <div className="text-center">
                <h2 className="text-xl text-foreground mb-2">
                  {userType === 'pedestrian' ? '🙌 歡迎加入！' : '🚦 歡迎上路！'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {userType === 'pedestrian'
                    ? '你可以開始提醒路上的汽車與機車'
                    : '每天都有 2 點免費額度，用一個更文明的方式提醒彼此'}
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center italic">
                我們相信，多數人不是故意的，只是沒被提醒。
              </p>

              {userType === 'pedestrian' && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 text-left">
                  <ul className="space-y-1 text-xs text-foreground">
                    <li>✅ 可以發送提醒</li>
                    <li>✅ 每天免費 2 點</li>
                    <li>⚠️ 因沒有車牌，無法接收提醒</li>
                  </ul>
                </div>
              )}

              {inviteCodeApplied && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 text-center">
                    🎉 已使用邀請碼，完成註冊即可獲得獎勵點數
                  </p>
                </div>
              )}
            </div>

            <Button
              className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
              onClick={handleCompleteOnboarding}
              disabled={isLoading}
            >
              {isLoading ? '處理中...' : '開始使用'}
            </Button>
          </Card>
        )}
      </div>

      {/* 車牌已被綁定警示對話框 */}
      <Dialog open={showLicensePlateDialog} onOpenChange={setShowLicensePlateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>此車牌已被註冊</DialogTitle>
            <DialogDescription>
              車牌 <strong>{licensePlate.toUpperCase()}</strong> 已有人註冊。
              {licensePlateCheckResult?.authProvider && (
                <>
                  <br />
                  註冊方式：<strong>{licensePlateCheckResult.authProvider === 'apple' ? 'Apple 帳號' : 'LINE 帳號'}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowLicensePlateDialog(false);
                alert('您可以返回登入頁面，嘗試使用其他帳號（Apple 或 LINE）登入，看看是否能找到您之前的帳戶。');
              }}
              className="w-full justify-start gap-2"
            >
              <span>🔑</span>
              我忘記用哪個帳號註冊了
            </Button>
            <Button onClick={handleConfirmApplication} className="w-full justify-start gap-2">
              <span>🚗</span>
              這是我的車，但被別人註冊
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowLicensePlateDialog(false);
                setLicensePlate('');
              }}
              className="w-full justify-start gap-2"
            >
              <span>←</span>
              重新輸入車牌
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 車牌申請對話框 */}
      <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交車牌申請</DialogTitle>
            <DialogDescription>
              請上傳行照照片（需包含車牌資料），我們會在 1-2 個工作天內審核並以 Email 通知。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="applicationEmail">Email（用於接收審核通知）</Label>
              <Input
                id="applicationEmail"
                type="email"
                placeholder="請輸入您的 Email"
                value={applicationEmail}
                onChange={(e) => setApplicationEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>行照照片</Label>
              {licenseImage ? (
                <div className="relative">
                  <div className="border border-border rounded-lg p-2 sm:p-3 flex items-center gap-2 sm:gap-3 bg-muted/30">
                    <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-foreground flex-1 truncate min-w-0">
                      {licenseImageFile?.name || '已上傳圖片'}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1 hover:bg-muted rounded-full flex-shrink-0"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs sm:text-sm text-muted-foreground">上傳中...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 sm:gap-2">
                        <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          點擊選擇圖片
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          支援 JPG、PNG、GIF、WebP（最大 10MB）
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
            <div className="p-3 sm:p-4 bg-muted/30 rounded-lg">
              <p className="text-xs sm:text-sm text-foreground font-medium mb-1 sm:mb-2">申請資訊</p>
              <div className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-muted-foreground">
                <p>車牌號碼：{licensePlate.toUpperCase()}</p>
                <p>車輛類型：{vehicleType === 'car' ? '汽車' : '機車'}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-wrap">
            <Button variant="outline" onClick={() => setShowApplicationDialog(false)} className="flex-1 min-w-0 shrink">
              取消
            </Button>
            <Button onClick={handleSubmitApplication} disabled={isLoading || isUploading} className="flex-1 min-w-0 shrink">
              {isLoading ? '提交中...' : '提交申請'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

OnboardingPage.displayName = 'OnboardingPage';

export default OnboardingPage;
