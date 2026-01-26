import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登入 | UBeep 路上提醒平台',
  description: '登入 UBeep 開始使用路上提醒服務。使用 LINE 快速登入，輕鬆管理您的行車提醒。',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '登入 | UBeep 路上提醒平台',
    description: '登入 UBeep 開始使用路上提醒服務。',
    url: 'https://ubeep.app/login',
    type: 'website',
    locale: 'zh_TW',
    siteName: 'UBeep',
  },
  alternates: {
    canonical: 'https://ubeep.app/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
