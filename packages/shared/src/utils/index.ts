/**
 * BBBeep 共用工具函數
 */

// 車牌相關
export {
  formatLicensePlate,
  normalizeLicensePlate,
  displayLicensePlate,
  isValidLicensePlate,
} from './license-plate';

// 點數相關
export { getTotalPoints, hasEnoughPoints, isLowPoints } from './points';

/**
 * 格式化地點顯示，加上「在...附近」前綴
 * @param location 原始地點字串
 * @returns 格式化後的地點字串
 */
export function formatLocationDisplay(
  location: string | null | undefined
): string {
  if (!location) return '';
  return `在 ${location} 附近`;
}

/**
 * 生成隨機邀請碼
 * @param length 長度，預設為 6
 * @returns 邀請碼
 */
export function generateInviteCode(length: number = 6): string {
  // 排除易混淆字元：0, O, I, l
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 遮罩手機號碼
 * @param phone 手機號碼
 * @returns 遮罩後的手機號碼
 * @example maskPhone('0912345678') => '0912***678'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 7) return phone || '';
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}
