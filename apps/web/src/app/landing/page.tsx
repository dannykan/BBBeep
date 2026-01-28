'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Car, MessageCircle, Shield, Gift, ArrowRight } from 'lucide-react';

const LandingPage = React.memo(() => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-[32px] bg-[#3B82F6] flex items-center justify-center">
              <Car className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-bold text-[#3B82F6] tracking-tight">
              UBeep
            </h1>
          </div>

          {/* Tagline & Subtext */}
          <div className="text-center space-y-3">
            <p className="text-xl font-semibold text-gray-900">
              讓路上多一點善意 💙
            </p>
            <p className="text-[15px] text-gray-500 leading-relaxed">
              透過車牌發送善意提醒<br />
              讓每一位駕駛更安全
            </p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-[#3B82F6]" strokeWidth={1.5} />
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-900">善意提醒</p>
                <p className="text-sm text-gray-500">透過車牌發送友善訊息</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl">
              <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-[#D97706]" strokeWidth={1.5} />
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-900">安全匿名</p>
                <p className="text-sm text-gray-500">保護您的隱私安全</p>
              </div>
            </div>
          </div>

          {/* Trial Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FEF3C7] rounded-full">
              <Gift className="w-4 h-4 text-[#D97706]" strokeWidth={2} />
              <span className="text-[13px] font-semibold text-[#D97706]">
                新用戶 7 天試用期送 50 點！
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div className="px-6 pb-10 pt-4 bg-white">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => router.push('/login')}
            className="w-full h-14 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-colors"
          >
            立即開始
            <ArrowRight className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
});

LandingPage.displayName = 'LandingPage';

export default LandingPage;
