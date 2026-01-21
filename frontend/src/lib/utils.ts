import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化地點顯示，加上「在...附近」前綴
 * @param location 原始地點字串
 * @returns 格式化後的地點字串
 */
export function formatLocationDisplay(location: string | null | undefined): string {
  if (!location) return '';
  return `在 ${location} 附近`;
}

/**
 * 計算用戶總點數（購買點數 + 每日免費點數）
 * @param user 用戶物件
 * @returns 總點數
 */
export function getTotalPoints(user: { points?: number; freePoints?: number } | null | undefined): number {
  if (!user) return 0;
  return (user.points ?? 0) + (user.freePoints ?? 0);
}
