'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api-services';

type Step = 'phone' | 'otp' | 'password';

const OTP_COUNTDOWN_SECONDS = 180;

const ForgotPasswordPage = React.memo(() => {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState(OTP_COUNTDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [verifyErrorCount, setVerifyErrorCount] = useState<number>(0); // 驗證碼錯誤次數

  useEffect(() => {
    if (step === 'otp' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, countdown]);

  const handleGetOtp = async () => {
    if (!/^09\d{8}$/.test(phone)) {
      toast.error('請輸入正確的手機號碼格式');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.verifyPhone(phone);
      setRemainingAttempts(response.remaining ?? null);
      setStep('otp');
      setCountdown(OTP_COUNTDOWN_SECONDS);
      setCanResend(false);
      toast.success('驗證碼已發送');
    } catch (error: any) {
      // 显示详细错误信息，包括次数限制
      const errorMessage = error.response?.data?.message || '發送驗證碼失敗';
      toast.error(errorMessage);
      // 如果超过次数限制，不切换步骤，停留在手机号输入页面
      if (error.response?.status === 401 && errorMessage.includes('已達上限')) {
        // 保持当前步骤，不进入验证码页面
        setStep('phone');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.verifyPhone(phone);
      setRemainingAttempts(response.remaining ?? null);
      setCountdown(OTP_COUNTDOWN_SECONDS);
      setCanResend(false);
      setOtp('');
      setVerifyErrorCount(0); // 重置錯誤次數
      toast.success('驗證碼已重新發送');
      // 重新設置 SMS OTP 監聽
      setupSMSOTPListener();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '發送驗證碼失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 設置 SMS OTP 自動填入（僅在移動設備上）
  const setupSMSOTPListener = () => {
    // 檢查是否支持 WebOTP API
    if ('OTPCredential' in window) {
      const abortController = new AbortController();
      
      navigator.credentials
        .get({
          otp: { transport: ['sms'] },
          signal: abortController.signal,
        } as any)
        .then((otp: any) => {
          if (otp && otp.code) {
            // 自動填入驗證碼
            setOtp(otp.code);
            // 自動驗證（延遲一下確保狀態更新）
            setTimeout(() => {
              if (otp.code && otp.code.length === 6) {
                handleVerifyOtp();
              }
            }, 300);
          }
        })
        .catch((err) => {
          // 用戶取消或 API 不支持，靜默失敗
          if (err.name !== 'AbortError' && err.name !== 'NotSupportedError') {
            console.log('SMS OTP auto-fill failed:', err);
          }
        });

      // 5 分鐘後取消監聽（與驗證碼過期時間一致）
      setTimeout(() => {
        abortController.abort();
      }, 300000);

      return abortController;
    }
    return null;
  };

  // 當進入驗證碼輸入頁面時設置 SMS OTP 監聽
  useEffect(() => {
    let abortController: AbortController | null = null;
    
    if (step === 'otp' && phone) {
      // 只在 HTTPS 或 localhost 環境下啟用
      if (typeof window !== 'undefined' && 
          (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
        abortController = setupSMSOTPListener();
      }
    }

    // 清理函數
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, phone]);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('請輸入完整的驗證碼');
      return;
    }

    // 验证验证码（通过调用 resetPassword API 来验证，但不实际重置密码）
    // 注意：这里需要调用一个验证验证码的 API，或者我们可以直接进入密码设置页面
    // 但为了保持一致性，我们需要在设置密码时验证验证码
    // 暂时先进入密码设置页面，验证会在设置密码时进行
    setStep('password');
  };

  const handleResetPassword = async () => {
    if (!password) {
      toast.error('請輸入新密碼');
      return;
    }

    if (!/^[a-zA-Z0-9]{6,12}$/.test(password)) {
      toast.error('密碼長度應為6-12位，且只能包含英文字母和數字');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('兩次輸入的密碼不一致');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(phone, otp, password);
      setVerifyErrorCount(0); // 重置錯誤次數
      toast.success('密碼重設成功！請使用新密碼重新登入', { duration: 3000 });
      // 延迟一下让用户看到成功消息
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '重設密碼失敗';
      
      // 检查是否是连续5次错误
      if (errorMessage.includes('連續5次輸入錯誤')) {
        toast.error(errorMessage + '，請重新輸入手機號碼獲取驗證碼');
        // 重置状态，返回手机号输入页面
        setStep('phone');
        setOtp('');
        setPassword('');
        setConfirmPassword('');
        setVerifyErrorCount(0);
        return;
      }
      
      // 解析剩余次数
      const match = errorMessage.match(/剩餘 (\d+) 次機會/);
      if (match) {
        const remaining = parseInt(match[1], 10);
        setVerifyErrorCount(5 - remaining);
        setOtp(''); // 清空驗證碼，讓用戶重新輸入
        toast.error(errorMessage);
      } else {
        setOtp(''); // 清空驗證碼，讓用戶重新輸入
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between relative">
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">忘記密碼</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-6">
        <Card className="p-6 space-y-6 bg-card border-border shadow-none">
          {step === 'phone' && (
            <>
              <div className="space-y-1">
                <h2 className="text-xl text-foreground">輸入手機號碼</h2>
                <p className="text-sm text-muted-foreground">我們將發送驗證碼到您的手機</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-sm text-foreground">
                  手機號碼
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  className="h-11 bg-input-background border-border"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && phone.length === 10) {
                      handleGetOtp();
                    }
                  }}
                />
                <Button
                  className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
                  onClick={handleGetOtp}
                  disabled={phone.length !== 10 || isLoading}
                >
                  {isLoading ? '發送中...' : '發送驗證碼'}
                </Button>

                {process.env.NODE_ENV === 'development' && phone.length === 10 && (
                  <button
                    onClick={async () => {
                      try {
                        await authApi.resetVerifyCount(phone);
                        toast.success('驗證碼發送次數已重置');
                        setRemainingAttempts(5);
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || '重置失敗');
                      }
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground underline text-center mt-2"
                  >
                    [開發] 重置發送次數
                  </button>
                )}
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="space-y-1">
                <h2 className="text-xl text-foreground">輸入驗證碼</h2>
                <p className="text-sm text-muted-foreground">驗證碼已發送至 {phone}</p>
                {remainingAttempts !== null && (
                  <p className="text-xs text-muted-foreground">
                    今日剩餘發送次數：{remainingAttempts} 次
                  </p>
                )}
                {verifyErrorCount > 0 && (
                  <p className="text-xs text-destructive">
                    驗證碼錯誤 {verifyErrorCount} 次，剩餘 {5 - verifyErrorCount} 次機會
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    onComplete={handleVerifyOtp}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="text-center space-y-2">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      重新發送 ({formatTime(countdown)})
                    </p>
                  ) : (
                    <button
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-sm text-primary hover:underline"
                    >
                      重新發送驗證碼
                    </button>
                  )}
                </div>

                <Button
                  className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || isLoading}
                >
                  {isLoading ? '驗證中...' : '確認'}
                </Button>

                <button
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setCountdown(OTP_COUNTDOWN_SECONDS);
                    setCanResend(false);
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  更改手機號碼
                </button>
              </div>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="space-y-1">
                <h2 className="text-xl text-foreground">設定新密碼</h2>
                <p className="text-sm text-muted-foreground">請輸入6-12位英數密碼</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-foreground">
                    新密碼
                    {password && (password.length < 6 || !/^[a-zA-Z0-9]+$/.test(password)) && (
                      <span className="ml-2 text-xs text-destructive">
                        {password.length < 6 ? '（至少6位）' : '（只能使用英數）'}
                      </span>
                    )}
                  </Label>
                  <PasswordInput
                    id="password"
                    placeholder="請輸入新密碼"
                    value={password}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 限制最多12位
                      if (value.length <= 12) {
                        setPassword(value);
                      }
                    }}
                    className={`h-11 bg-input-background ${
                      password && (password.length < 6 || !/^[a-zA-Z0-9]+$/.test(password))
                        ? 'border-destructive'
                        : 'border-border'
                    }`}
                    autoHideDelay={2000}
                    maxLength={12}
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      6-12位英數，可大小寫，不可使用符號
                    </p>
                    {password && password.length < 6 && (
                      <p className="text-xs text-destructive">密碼長度至少需要6位</p>
                    )}
                    {password && password.length >= 6 && !/^[a-zA-Z0-9]+$/.test(password) && (
                      <p className="text-xs text-destructive">密碼只能包含英文字母和數字，不可使用符號</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm text-foreground">
                    確認密碼
                    {confirmPassword && password && confirmPassword !== password && (
                      <span className="ml-2 text-xs text-destructive">（密碼不一致）</span>
                    )}
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="請再次輸入密碼"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`h-11 bg-input-background ${
                      confirmPassword && password && confirmPassword !== password
                        ? 'border-destructive'
                        : 'border-border'
                    }`}
                    autoHideDelay={2000}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password && confirmPassword) {
                        handleResetPassword();
                      }
                    }}
                  />
                  {confirmPassword && password && confirmPassword !== password && (
                    <p className="text-xs text-destructive">密碼不一致，請重新輸入</p>
                  )}
                </div>

                <Button
                  className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
                  onClick={handleResetPassword}
                  disabled={!password || !confirmPassword || password !== confirmPassword || isLoading}
                >
                  {isLoading ? '重設中...' : '重設密碼'}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
});

ForgotPasswordPage.displayName = 'ForgotPasswordPage';

export default ForgotPasswordPage;
