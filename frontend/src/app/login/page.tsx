'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api-services';
import { LineLoginButton } from '@/components/LineLoginButton';

type Step = 'phone' | 'otp' | 'password' | 'login';

const OTP_COUNTDOWN_SECONDS = 180;

// 解析啟用的登入方式
const getEnabledLoginMethods = () => {
  const methods = process.env.NEXT_PUBLIC_LOGIN_METHODS || 'phone,line';
  return methods.split(',').map((m) => m.trim().toLowerCase());
};

const LoginPage = React.memo(() => {
  // 登入方式設定
  const enabledMethods = getEnabledLoginMethods();
  const isPhoneEnabled = enabledMethods.includes('phone');
  const isLineEnabled = enabledMethods.includes('line');
  const isLineOnly = isLineEnabled && !isPhoneEnabled;
  const router = useRouter();
  const { login: loginContext, refreshUser, refreshMessages, refreshPointHistory } = useApp();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState(OTP_COUNTDOWN_SECONDS);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [verifyErrorCount, setVerifyErrorCount] = useState<number>(0); // 驗證碼錯誤次數
  const [passwordErrorCount, setPasswordErrorCount] = useState<number>(0); // 密碼錯誤次數

  const handlePhoneCheck = async () => {
    if (!/^09\d{8}$/.test(phone)) {
      toast.error('請輸入正確的手機號碼格式');
      return;
    }

    setIsCheckingPhone(true);
    try {
      const result = await authApi.checkPhone(phone);
      
      if (!result.exists || !result.hasPassword) {
        // 未注册或未设置密码，进入注册流程（验证码）
        setIsRegistered(false);
        // 直接调用 verifyPhone 来检查次数限制
        try {
          const response = await authApi.verifyPhone(phone);
          setRemainingAttempts(response.remaining ?? null);
          setStep('otp');
          setCountdown(OTP_COUNTDOWN_SECONDS);
          toast.success('驗證碼已發送');
        } catch (error: any) {
          // 如果超过次数限制，显示错误并停留在手机号输入页面
          const errorMessage = error.response?.data?.message || '發送驗證碼失敗';
          toast.error(errorMessage);
          // 不切换步骤，停留在手机号输入页面
          return;
        }
      } else {
        // 已注册且有密码，显示密码输入框
        setIsRegistered(true);
        setStep('login');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '檢查失敗');
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleGetOtp = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.verifyPhone(phone);
      setRemainingAttempts(response.remaining ?? null);
      setStep('otp');
      setCountdown(OTP_COUNTDOWN_SECONDS);
      toast.success('驗證碼已發送');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '發送驗證碼失敗');
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
      setOtp('');
      setVerifyErrorCount(0); // 重置錯誤次數
      toast.success('驗證碼已重新發送');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '發送驗證碼失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('請輸入完整的驗證碼');
      return;
    }

    setIsLoading(true);
    try {
      // 先检查用户是否需要设置密码
      const result = await authApi.checkPhone(phone);
      
      if (!result.exists || !result.hasPassword) {
        // 新用户或未设置密码，需要设置密码
        // 不调用 login API（它会删除验证码），直接进入密码设置页面
        // 验证码会在 setPassword 时验证
        setVerifyErrorCount(0);
        setStep('password');
      } else {
        // 已有密码的用户，使用验证码登录
        const response = await authApi.login(phone, otp);
        setVerifyErrorCount(0);
        // 直接保存 token 和用户数据，不调用 loginContext（避免双重跳转）
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        // 刷新用户数据（后台执行，不阻塞）
        refreshUser().catch(console.error);
        refreshMessages().catch(console.error);
        refreshPointHistory().catch(console.error);
        toast.success('登入成功');
        if (response.user.hasCompletedOnboarding) {
          router.push('/home');
        } else {
          router.push('/onboarding');
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '驗證失敗';
      
      // 检查是否是连续5次错误
      if (errorMessage.includes('連續5次輸入錯誤')) {
        toast.error(errorMessage + '，請重新輸入手機號碼獲取驗證碼');
        // 重置状态，返回手机号输入页面
        setStep('phone');
        setOtp('');
        setVerifyErrorCount(0);
        return;
      }
      
      // 解析剩余次数（格式：驗證碼錯誤，剩餘 X 次機會）
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

  const handleSetPassword = async () => {
    // 验证验证码时会检查错误次数，所以这里不需要额外处理
    if (!newPassword) {
      toast.error('請輸入密碼');
      return;
    }

    if (!/^[a-zA-Z0-9]{6,12}$/.test(newPassword)) {
      toast.error('密碼長度應為6-12位，且只能包含英文字母和數字');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('兩次輸入的密碼不一致');
      return;
    }

    setIsLoading(true);
    try {
      // 设置密码（会自动验证验证码并返回 token）
      const response = await authApi.setPassword(phone, otp, newPassword);
      setVerifyErrorCount(0); // 重置錯誤次數
      
      // 使用返回的 token 登入
      if (response.access_token && response.user) {
        // 直接保存 token 和用户数据，不调用 loginContext（避免双重跳转）
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        // 刷新用户数据（后台执行，不阻塞）
        refreshUser().catch(console.error);
        refreshMessages().catch(console.error);
        refreshPointHistory().catch(console.error);
        toast.success('密碼設置成功，即將進入註冊流程');
        // 延迟一下让用户看到成功消息
        setTimeout(() => {
          router.push('/onboarding');
        }, 500);
      } else {
        // 如果后端没有返回 token，使用验证码登录
        const loginResponse = await authApi.login(phone, otp);
        localStorage.setItem('token', loginResponse.access_token);
        localStorage.setItem('user', JSON.stringify(loginResponse.user));
        refreshUser().catch(console.error);
        refreshMessages().catch(console.error);
        refreshPointHistory().catch(console.error);
        toast.success('密碼設置成功，即將進入註冊流程');
        setTimeout(() => {
          router.push('/onboarding');
        }, 500);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '設置密碼失敗';
      
      // 检查是否是连续5次错误
      if (errorMessage.includes('連續5次輸入錯誤')) {
        toast.error(errorMessage + '，請重新輸入手機號碼獲取驗證碼');
        // 重置状态，返回手机号输入页面
        setStep('phone');
        setOtp('');
        setNewPassword('');
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

  const handlePasswordLogin = async () => {
    if (!/^09\d{8}$/.test(phone)) {
      toast.error('請輸入正確的手機號碼格式');
      return;
    }

    if (!password) {
      toast.error('請輸入密碼');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.passwordLogin(phone, password);
      // 登录成功，清除错误计数
      setPasswordErrorCount(0);
      // 直接保存 token 和用户数据，不调用 loginContext（避免双重跳转）
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      // 刷新用户数据（后台执行，不阻塞）
      refreshUser().catch(console.error);
      refreshMessages().catch(console.error);
      refreshPointHistory().catch(console.error);
      toast.success('登入成功');
      // 根据用户是否完成 onboarding 跳转
      if (response.user.hasCompletedOnboarding) {
        router.push('/home');
      } else {
        router.push('/onboarding');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '登入失敗';
      
      if (error.response?.status === 401) {
        if (errorMessage.includes('尚未設置密碼')) {
          // 未设置密码，进入设置密码流程
          await handleGetOtp();
          return;
        }
        
        // 检查是否是连续5次错误
        if (errorMessage.includes('連續5次輸入錯誤')) {
          toast.error(errorMessage + '，請前往忘記密碼頁面重設密碼');
          // 延迟跳转到忘记密码页面
          setTimeout(() => {
            router.push('/forgot-password');
          }, 1000);
          return;
        }
        
        // 解析剩余次数（格式：密碼錯誤，剩餘 X 次機會）
        const match = errorMessage.match(/剩餘 (\d+) 次機會/);
        if (match) {
          const remaining = parseInt(match[1], 10);
          toast.error(errorMessage);
          setPassword(''); // 清空密碼，讓用戶重新輸入
        } else {
          // 普通密码错误
          toast.error('手機號碼或密碼錯誤');
          setPassword(''); // 清空密碼，讓用戶重新輸入
        }
      } else {
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

  const getPageTitle = () => {
    switch (step) {
      case 'phone':
        return '註冊/登入';
      case 'login':
        return '登入';
      case 'otp':
        return '驗證碼';
      case 'password':
        return '設置密碼';
      default:
        return '註冊/登入';
    }
  };

  // Countdown timer for OTP
  React.useEffect(() => {
    if (step === 'otp' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, countdown]);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between relative">
          <button
            onClick={() => {
              if (step === 'phone') {
                router.push('/landing');
              } else if (step === 'login' && isRegistered) {
                setStep('phone');
                setPassword('');
                setIsRegistered(null);
              } else {
                setStep('phone');
                setPassword('');
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setIsRegistered(null);
              }
            }}
            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
            <span className="text-sm text-muted-foreground">返回</span>
          </button>
          <h1 className="text-base text-foreground absolute left-1/2 -translate-x-1/2">{getPageTitle()}</h1>
          <div className="w-[80px]" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-6">
        <Card className="p-6 space-y-6 bg-card border-border shadow-none">
          {step === 'phone' && (
            <>
              {/* LINE Only 模式 */}
              {isLineOnly && (
                <>
                  <div className="space-y-1">
                    <h2 className="text-xl text-foreground">註冊/登入</h2>
                    <p className="text-sm text-muted-foreground">使用 LINE 帳號註冊或登入</p>
                  </div>

                  <div className="space-y-4">
                    <LineLoginButton />
                  </div>
                </>
              )}

              {/* 手機登入模式（含可選 LINE 登入） */}
              {isPhoneEnabled && (
                <>
                  <div className="space-y-1">
                    <h2 className="text-xl text-foreground">註冊/登入</h2>
                    <p className="text-sm text-muted-foreground">請輸入手機號碼</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
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
                            handlePhoneCheck();
                          }
                        }}
                      />
                    </div>

                    <Button
                      className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
                      onClick={handlePhoneCheck}
                      disabled={phone.length !== 10 || isCheckingPhone}
                    >
                      {isCheckingPhone ? '檢查中...' : '下一步'}
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

                    {/* LINE 登入（如果啟用） */}
                    {isLineEnabled && (
                      <>
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">或</span>
                          </div>
                        </div>
                        <LineLoginButton disabled={isCheckingPhone} />
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {step === 'login' && isRegistered && (
            <>
              <div className="space-y-1">
                <h2 className="text-xl text-foreground">登入</h2>
                <p className="text-sm text-muted-foreground">請輸入密碼</p>
              </div>

              <div className="space-y-4">
                {passwordErrorCount > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      密碼錯誤 {passwordErrorCount} 次，剩餘 {5 - passwordErrorCount} 次機會
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-foreground">
                    密碼
                  </Label>
                  <PasswordInput
                    id="password"
                    placeholder="請輸入密碼"
                    value={password}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 限制最多12位
                      if (value.length <= 12) {
                        setPassword(value);
                      }
                      // 输入时清除错误计数（如果用户修改了密码）
                      if (passwordErrorCount > 0) {
                        setPasswordErrorCount(0);
                      }
                    }}
                    className={`h-11 bg-input-background border-border ${
                      passwordErrorCount > 0 ? 'border-red-500 dark:border-red-500' : ''
                    }`}
                    autoHideDelay={2000}
                    maxLength={12}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password) {
                        handlePasswordLogin();
                      }
                    }}
                  />
                </div>

                <Button
                  className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
                  onClick={handlePasswordLogin}
                  disabled={!password || isLoading}
                >
                  {isLoading ? '登入中...' : '登入'}
                </Button>

                <button
                  onClick={() => router.push('/forgot-password')}
                  className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
                >
                  忘記密碼？
                </button>
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
                    setIsRegistered(null);
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  返回
                </button>
              </div>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="space-y-1">
                <h2 className="text-xl text-foreground">設置密碼</h2>
                <p className="text-sm text-muted-foreground">請輸入6-12位英數密碼</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm text-foreground">
                    密碼
                    {newPassword && (newPassword.length < 6 || !/^[a-zA-Z0-9]+$/.test(newPassword)) && (
                      <span className="ml-2 text-xs text-destructive">
                        {newPassword.length < 6 ? '（至少6位）' : '（只能使用英數）'}
                      </span>
                    )}
                  </Label>
                  <PasswordInput
                    id="newPassword"
                    placeholder="請輸入密碼"
                    value={newPassword}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 限制最多12位
                      if (value.length <= 12) {
                        setNewPassword(value);
                      }
                    }}
                    className={`h-11 bg-input-background ${
                      newPassword && (newPassword.length < 6 || !/^[a-zA-Z0-9]+$/.test(newPassword))
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
                    {newPassword && newPassword.length < 6 && (
                      <p className="text-xs text-destructive">密碼長度至少需要6位</p>
                    )}
                    {newPassword && newPassword.length >= 6 && !/^[a-zA-Z0-9]+$/.test(newPassword) && (
                      <p className="text-xs text-destructive">密碼只能包含英文字母和數字，不可使用符號</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm text-foreground">
                    確認密碼
                    {confirmPassword && newPassword && confirmPassword !== newPassword && (
                      <span className="ml-2 text-xs text-destructive">（密碼不一致）</span>
                    )}
                  </Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="請再次輸入密碼"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`h-11 bg-input-background ${
                      confirmPassword && newPassword && confirmPassword !== newPassword
                        ? 'border-destructive'
                        : 'border-border'
                    }`}
                    autoHideDelay={2000}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newPassword && confirmPassword) {
                        handleSetPassword();
                      }
                    }}
                  />
                  {confirmPassword && newPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-destructive">密碼不一致，請重新輸入</p>
                  )}
                </div>

                <Button
                  className="w-full h-11 bg-primary hover:bg-primary-dark text-white"
                  onClick={handleSetPassword}
                  disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || isLoading}
                >
                  {isLoading ? '設置中...' : '確認'}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
});

LoginPage.displayName = 'LoginPage';

export default LoginPage;
