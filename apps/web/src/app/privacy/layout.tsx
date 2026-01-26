import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '隱私權政策 | UBeep 路上提醒平台',
  description:
    'UBeep 隱私權政策。了解我們如何收集、使用和保護您的個人資料，以及您的資料權利。',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '隱私權政策 | UBeep 路上提醒平台',
    description: 'UBeep 隱私權政策。了解我們如何保護您的個人資料。',
    url: 'https://ubeep.app/privacy',
    type: 'website',
    locale: 'zh_TW',
    siteName: 'UBeep',
  },
  alternates: {
    canonical: 'https://ubeep.app/privacy',
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
