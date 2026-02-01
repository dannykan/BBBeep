import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://ubeep.app'),
  title: {
    default: 'UBeep - 路上不用對立，也可以好好說話',
    template: '%s | UBeep',
  },
  description: 'UBeep 是匿名、即時、不擴散的道路提醒平台。透過車牌號碼發送善意提醒，讓駕駛、騎士、腳踏車騎士和行人可以友善溝通，不用面對面衝突。',
  keywords: [
    'UBeep',
    '道路溝通',
    '匿名提醒',
    '車牌',
    '駕駛',
    '行車安全',
    '路怒症',
    '交通安全',
    '機車騎士',
    '汽車駕駛',
    '行人安全',
    '道路禮儀',
    '善意提醒',
    '車牌查詢',
    '匿名訊息',
  ],
  authors: [{ name: 'UBeep', url: 'https://ubeep.app' }],
  creator: 'UBeep',
  publisher: 'UBeep',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'UBeep - 路上不用對立，也可以好好說話',
    description: 'UBeep 讓提醒變得私密、即時、不擴散。透過車牌匿名傳遞善意，為道路留一點溫暖。',
    url: 'https://ubeep.app',
    siteName: 'UBeep',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'UBeep - 匿名道路溝通平台',
      },
    ],
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UBeep - 路上不用對立，也可以好好說話',
    description: 'UBeep 讓提醒變得私密、即時、不擴散。透過車牌匿名傳遞善意。',
    images: ['/images/og-image.png'],
    creator: '@ubeep_app',
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
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/images/logo.png', type: 'image/png' },
    ],
    apple: '/images/logo.png',
  },
  verification: {
    // google: 'your-google-verification-code',  // 之後加入 Google Search Console 驗證碼
  },
  category: 'technology',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  // JSON-LD 結構化資料
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'UBeep',
    description: 'UBeep 是匿名、即時、不擴散的道路提醒平台。透過車牌號碼發送善意提醒。',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'TWD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1000',
    },
    author: {
      '@type': 'Organization',
      name: 'UBeep',
      url: 'https://ubeep.app',
    },
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'UBeep',
    url: 'https://ubeep.app',
    logo: 'https://ubeep.app/images/logo.png',
    sameAs: [
      // 之後可加入社群連結
      // 'https://www.facebook.com/ubeep',
      // 'https://www.instagram.com/ubeep',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@ubeep.app',
      contactType: 'customer service',
    },
  };

  return (
    <html lang={locale}>
      <head>
        {/* Remix Icon for icons */}
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css"
          rel="stylesheet"
        />
        {/* JSON-LD 結構化資料 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
