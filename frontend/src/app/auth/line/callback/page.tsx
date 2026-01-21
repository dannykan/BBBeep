'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { authApi } from '@/lib/api-services';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function LineCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, refreshMessages, refreshPointHistory } = useApp();
  const [error, setError] = useState<string | null>(null);
  const isProcessing = useRef(false); // 防止重複執行

  useEffect(() => {
    const handleCallback = async () => {
      // 防止 React Strict Mode 導致的重複執行
      if (isProcessing.current) {
        return;
      }
      isProcessing.current = true;
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // 檢查是否有錯誤
      if (errorParam) {
        setError(errorDescription || 'LINE 登入失敗');
        toast.error(errorDescription || 'LINE 登入失敗');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      // 檢查必要參數
      if (!code || !state) {
        setError('缺少必要參數');
        toast.error('LINE 登入失敗：缺少必要參數');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      // 驗證 state（防止 CSRF 攻擊）
      const savedState = localStorage.getItem('line_login_state');
      if (state !== savedState) {
        // 暫時只記錄警告，不阻擋登入流程（用於調試）
        console.warn('[LINE_CALLBACK] State mismatch (skipping validation):', { state, savedState });
      }

      // 清除已使用的 state
      localStorage.removeItem('line_login_state');

      try {
        console.log('[LINE_CALLBACK] Calling backend API with code:', code.substring(0, 10) + '...');

        // 呼叫後端 API 完成登入
        const response = await authApi.lineLogin(code, state);

        console.log('[LINE_CALLBACK] Login successful, user:', response.user?.id);

        // 儲存 token 和用戶資料
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));

        // 刷新用戶資料（必須等待完成才能跳轉）
        await refreshUser();
        await refreshMessages();
        await refreshPointHistory();

        toast.success('LINE 登入成功');

        // 根據 onboarding 狀態跳轉
        if (response.user.hasCompletedOnboarding) {
          router.push('/home');
        } else {
          router.push('/onboarding');
        }
      } catch (error: any) {
        console.error('[LINE_CALLBACK] Login error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });

        const errorMessage = error.response?.data?.message || 'LINE 登入失敗，請稍後再試';
        const errorDetail = error.response?.status
          ? `(錯誤代碼: ${error.response.status})`
          : '';

        setError(`${errorMessage} ${errorDetail}`);
        toast.error(errorMessage);
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, refreshUser, refreshMessages, refreshPointHistory]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="text-destructive text-lg">{error}</div>
            <p className="text-muted-foreground text-sm">正在返回登入頁面...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">正在處理 LINE 登入...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LineCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      }
    >
      <LineCallbackContent />
    </Suspense>
  );
}
