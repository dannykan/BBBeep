'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Drawer({ open, onClose, children, title }: DrawerProps) {
  // 防止背景滾動
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* 抽屜內容 */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl',
          'transform transition-transform duration-300 ease-out',
          'max-h-[80vh] overflow-hidden',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* 拖曳把手 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* 標題和關閉按鈕 */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-2">
            <h3 className="text-lg font-medium">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 內容區域 - 底部留出足夠空間避免被 BottomNav 擋住 */}
        <div className="px-4 pb-24">
          {children}
        </div>
      </div>
    </div>
  );
}
