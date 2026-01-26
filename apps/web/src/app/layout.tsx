import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'UBeep - 路上提醒平台',
    template: '%s | UBeep',
  },
  description: '一個更溫和的路上提醒選擇。私下提醒對方，不對罵、不公開，也不會變成衝突。',
  keywords: ['路上提醒', '行車提醒', '車牌', '駕駛提醒', 'UBeep', '台灣', '交通安全'],
  authors: [{ name: 'UBeep Team' }],
  creator: 'UBeep',
  publisher: 'UBeep',
  metadataBase: new URL('https://ubeep.app'),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'UBeep - 路上提醒平台',
    description: '一個更溫和的路上提醒選擇。私下提醒對方，不對罵、不公開，也不會變成衝突。',
    url: 'https://ubeep.app',
    type: 'website',
    locale: 'zh_TW',
    siteName: 'UBeep',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'UBeep 路上提醒平台',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UBeep - 路上提醒平台',
    description: '一個更溫和的路上提醒選擇。私下提醒對方，不對罵、不公開，也不會變成衝突。',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // 可以在此添加 Google Search Console 驗證碼
    // google: 'your-google-verification-code',
  },
};

// JSON-LD 結構化數據
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'UBeep',
  alternateName: '路上提醒平台',
  description: '一個更溫和的路上提醒選擇。私下提醒對方，不對罵、不公開，也不會變成衝突。',
  url: 'https://ubeep.app',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'iOS, Android, Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'TWD',
  },
  creator: {
    '@type': 'Organization',
    name: 'UBeep',
    url: 'https://ubeep.app',
  },
  inLanguage: 'zh-TW',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <head>
        <GoogleAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
