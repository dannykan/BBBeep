import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UBeep - 路上提醒平台 | 用善意取代憤怒',
  description:
    '一句善意提醒，讓路上少一點誤會。UBeep 是台灣首個私下路上提醒平台，讓駕駛者能以溫和的方式提醒對方，不對罵、不公開、不衝突。',
  keywords: ['路上提醒', '行車提醒', '車牌', '駕駛提醒', 'UBeep', '台灣'],
  openGraph: {
    title: 'UBeep - 路上提醒平台 | 用善意取代憤怒',
    description:
      '一句善意提醒，讓路上少一點誤會。UBeep 是台灣首個私下路上提醒平台，讓駕駛者能以溫和的方式提醒對方。',
    url: 'https://ubeep.app/landing',
    type: 'website',
    locale: 'zh_TW',
    siteName: 'UBeep',
    images: [
      {
        url: 'https://ubeep.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'UBeep 路上提醒平台',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UBeep - 路上提醒平台',
    description: '一句善意提醒，讓路上少一點誤會。台灣首個私下路上提醒平台。',
    images: ['https://ubeep.app/og-image.png'],
  },
  alternates: {
    canonical: 'https://ubeep.app/landing',
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
