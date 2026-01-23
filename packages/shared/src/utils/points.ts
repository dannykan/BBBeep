/**
 * 點數相關工具函數
 */

import type { User } from '../types';

/**
 * 計算用戶總點數（購買點數 + 每日免費點數）
 * @param user 用戶物件
 * @returns 總點數
 */
export function getTotalPoints(
  user: Pick<User, 'points' | 'freePoints'> | null | undefined
): number {
  if (!user) return 0;
  return (user.points ?? 0) + (user.freePoints ?? 0);
}

/**
 * 檢查用戶是否有足夠的點數
 * @param user 用戶物件
 * @param required 需要的點數
 * @returns 是否足夠
 */
export function hasEnoughPoints(
  user: Pick<User, 'points' | 'freePoints'> | null | undefined,
  required: number
): boolean {
  return getTotalPoints(user) >= required;
}

/**
 * 檢查用戶點數是否偏低
 * @param user 用戶物件
 * @param threshold 閾值，預設為 5
 * @returns 是否偏低
 */
export function isLowPoints(
  user: Pick<User, 'points' | 'freePoints'> | null | undefined,
  threshold: number = 5
): boolean {
  return getTotalPoints(user) < threshold;
}
