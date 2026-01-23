import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UBeep - 路上提醒平台',
  description: '一個更溫和的路上提醒選擇。私下提醒對方，不對罵、不公開，也不會變成衝突。',
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
    type: 'website',
    locale: 'zh_TW',
    siteName: 'UBeep',
  },
  twitter: {
    card: 'summary',
    title: 'UBeep - 路上提醒平台',
    description: '一個更溫和的路上提醒選擇。私下提醒對方，不對罵、不公開，也不會變成衝突。',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
