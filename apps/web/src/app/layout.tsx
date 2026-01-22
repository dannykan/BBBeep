import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '叭叭叭 BBBeep',
  description: '道路提醒互助平台，一個可以匿名發送善意提醒的管道！',
  openGraph: {
    title: '叭叭叭 BBBeep',
    description: '道路提醒互助平台，一個可以匿名發送善意提醒的管道！',
    type: 'website',
    locale: 'zh_TW',
    siteName: '叭叭叭 BBBeep',
  },
  twitter: {
    card: 'summary',
    title: '叭叭叭 BBBeep',
    description: '道路提醒互助平台，一個可以匿名發送善意提醒的管道！',
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
