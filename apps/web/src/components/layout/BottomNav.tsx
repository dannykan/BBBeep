'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Send, Inbox, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNav = React.memo(() => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { path: '/home', icon: Home, label: '首頁' },
    { path: '/send', icon: Send, label: '發送' },
    { path: '/inbox', icon: Inbox, label: '收件箱' },
    { path: '/settings', icon: Settings, label: '設定' },
  ];

  const isActive = (path: string) => {
    if (path === '/home') {
      return pathname === '/home';
    }
    return pathname?.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-md mx-auto">
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-3 transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
