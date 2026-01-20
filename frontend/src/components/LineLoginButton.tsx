'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface LineLoginButtonProps {
  className?: string;
  disabled?: boolean;
}

export function LineLoginButton({ className, disabled }: LineLoginButtonProps) {
  const handleLineLogin = () => {
    const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    const callbackUrl = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL;

    if (!channelId || !callbackUrl) {
      console.error('LINE 設定不完整');
      return;
    }

    // 產生隨機 state 用於防止 CSRF 攻擊
    const state = Math.random().toString(36).substring(2, 15);
    // 儲存 state 到 localStorage，callback 時驗證
    localStorage.setItem('line_login_state', state);

    // Debug: 確認 state 已儲存
    const savedState = localStorage.getItem('line_login_state');
    console.log('[LINE_LOGIN] State saved:', { state, savedState, match: state === savedState });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: channelId,
      redirect_uri: callbackUrl,
      state: state,
      scope: 'profile openid',
    });

    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full h-11 bg-[#00B900] hover:bg-[#00a000] text-white border-[#00B900] hover:border-[#00a000] ${className || ''}`}
      onClick={handleLineLogin}
      disabled={disabled}
    >
      <svg
        className="w-5 h-5 mr-2"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
      使用 LINE 註冊/登入
    </Button>
  );
}
