'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Car, Bike, User, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi, licensePlateApi } from '@/lib/api-services';
import type { UserType } from '@/types';
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
    boundPhone?: string;
    boundNickname?: string;
  } | null>(null);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [licenseImage, setLicenseImage] = useState<string>('');

  const handleUserTypeSelect = (type: UserType, vehicle?: 'car' | 'scooter') => {
    setUserType(type);
    if (vehicle) {
      setVehicleType(vehicle);
    }
    setStep(3);
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
      setStep(5);
    } else {
      setStep(4);
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
          boundPhone: checkResult.boundPhone,
          boundNickname: checkResult.boundNickname,
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
      setStep(5);
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
      });
      toast.success('申請已提交，我們會在 1-2 個工作天內以簡訊回覆');
      setShowApplicationDialog(false);
      // 跳過車牌步驟，繼續完成註冊（不綁定車牌）
      setStep(5);
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
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
    } else if (step === 5) {
      if (userType === 'pedestrian') {
        setStep(3);
      } else {
        setStep(4);
      }
    } else if (step === 6) {
      setStep(5);
    }
  };

  const totalSteps = userType === 'pedestrian' ? 5 : 6;
  const currentStep = userType === 'pedestrian' && step > 4 ? step - 1 : step;

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
          <Card className="p-6 space-y-6 bg-card border-border shadow-none">
            <div className="space-y-3 text-center">
              <h2 className="text-xl text-foreground">這不是聊天平台</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                我們希望把路上的衝突<br />
                變成私密、短暫、不擴散的提醒
              </p>
            </div>
            <Button
              className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
              onClick={() => setStep(2)}
            >
              下一步
            </Button>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">你是哪一種用路人？</h2>
              <p className="text-sm text-muted-foreground">選擇你的身分</p>
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
                      需填寫車牌｜可發送、可接收提醒
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
                      需填寫車牌｜可發送、可接收提醒
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
                    <p className="font-medium text-foreground">行人/腳踏車</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      不需車牌｜只能發送提醒
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <Card className="p-4 bg-muted/30 border-border">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                💡 行人/腳踏車用戶因沒有車牌，無法接收其他人的提醒
              </p>
            </Card>
          </div>
        )}

        {step === 3 && (
            <Card className="p-6 space-y-6 bg-card border-border shadow-none">
            <div className="space-y-3 text-center">
              <h2 className="text-xl text-foreground">設定暱稱（可選）</h2>
              <p className="text-sm text-muted-foreground">
                暱稱會在訊息中以匿名方式顯示<br />
                不設定也可以使用所有功能
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="nickname" className="text-sm text-foreground">
                暱稱
              </Label>
              <Input
                id="nickname"
                type="text"
                placeholder="例如：熱心駕駛"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
              />
              <p className="text-xs text-muted-foreground">最多 12 個字元</p>
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
                  跳過暱稱設定
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
              <h2 className="text-xl text-foreground">填寫車牌號碼</h2>
              <p className="text-sm text-muted-foreground">
                僅用於接收提醒，不會公開顯示
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
                {vehicleType === 'car' ? '格式範例：ABC1234（可不輸入連字符）' : '格式範例：ABC123（可不輸入連字符）'}
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
            <div className="space-y-4">
              <h2 className="text-xl text-foreground">
                這裡的每一次提醒<br />都需要點數
              </h2>

              <div className="space-y-2 text-sm text-left bg-muted/50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground">•</span>
                  <span className="text-foreground">提醒會消耗點數</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground">•</span>
                  <span className="text-foreground">讚美可以獲得少量點數</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground">•</span>
                  <span className="text-foreground">不公開車牌、不公開個人資訊</span>
                </div>
              </div>

              <div className="bg-primary/5 border-2 border-primary/30 rounded-lg p-4">
                <p className="text-sm font-medium text-primary-dark">
                  🎁 新手禮包：8 點免費體驗
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

              <div>
                <h2 className="text-xl text-foreground mb-2">
                  {userType === 'pedestrian' ? '歡迎加入！' : '歡迎上路！'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {userType === 'pedestrian'
                    ? '你可以開始發送提醒給其他用路人'
                    : '你已獲得 8 點免費體驗點數'}
                </p>
              </div>

              {userType === 'pedestrian' && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 text-left">
                  <p className="text-xs text-muted-foreground mb-2">行人用戶說明：</p>
                  <ul className="space-y-1 text-xs text-foreground">
                    <li>✅ 可以發送提醒給汽車/機車駕駛</li>
                    <li>✅ 獲得 8 點新手禮包</li>
                    <li>⚠️ 無法收到提醒（因為沒有車牌）</li>
                  </ul>
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
            <DialogTitle>車牌已被登記</DialogTitle>
            <DialogDescription>
              該車牌號碼 <strong>{licensePlate.toUpperCase()}</strong> 已被綁定到手機號碼{' '}
              <strong>{licensePlateCheckResult?.boundPhone}</strong>
              {licensePlateCheckResult?.boundNickname && ` (${licensePlateCheckResult.boundNickname})`}。
              <br />
              <br />
              這是否為您的車輛？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLicensePlateDialog(false);
                setLicensePlate('');
              }}
            >
              不是，重新輸入
            </Button>
            <Button onClick={handleConfirmApplication}>
              是，提交申請
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 車牌申請對話框 */}
      <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>提交車牌申請</DialogTitle>
            <DialogDescription>
              請上傳行照照片（需包含車牌資料），我們會在 1-2 個工作天內審核並以簡訊回覆。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="licenseImage">行照照片</Label>
              <Input
                id="licenseImage"
                type="text"
                placeholder="請輸入圖片 URL（或使用圖片上傳服務）"
                value={licenseImage}
                onChange={(e) => setLicenseImage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                提示：您可以先將照片上傳到圖床服務（如 imgur），然後貼上 URL
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-foreground font-medium mb-2">申請資訊</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>車牌號碼：{licensePlate.toUpperCase()}</p>
                <p>車輛類型：{vehicleType === 'car' ? '汽車' : '機車'}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplicationDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitApplication} disabled={isLoading}>
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
