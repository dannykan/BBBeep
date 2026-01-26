import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '服務條款 | UBeep 路上提醒平台',
  description: 'UBeep 服務條款。了解使用 UBeep 路上提醒服務的條款與條件。',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '服務條款 | UBeep 路上提醒平台',
    description: 'UBeep 服務條款。了解使用我們服務的條款與條件。',
    url: 'https://ubeep.app/terms',
    type: 'website',
    locale: 'zh_TW',
    siteName: 'UBeep',
  },
  alternates: {
    canonical: 'https://ubeep.app/terms',
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
