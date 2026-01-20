import { MessageType } from '@prisma/client';

/**
 * MessageType enum 映射
 * Prisma enum 使用英文，但 API 和前端使用中文
 */

export const MESSAGE_TYPE_MAP = {
  VEHICLE_REMINDER: '車況提醒',
  SAFETY_REMINDER: '行車安全提醒',
  PRAISE: '讚美感謝',
} as const;

export const MESSAGE_TYPE_REVERSE_MAP = {
  '車況提醒': MessageType.VEHICLE_REMINDER,
  '行車安全提醒': MessageType.SAFETY_REMINDER,
  '讚美感謝': MessageType.PRAISE,
} as const;

export type MessageTypeChinese = keyof typeof MESSAGE_TYPE_REVERSE_MAP;

/**
 * 將 Prisma enum 轉換為中文
 */
export function toChineseType(type: MessageType): MessageTypeChinese {
  return MESSAGE_TYPE_MAP[type] as MessageTypeChinese;
}

/**
 * 將中文轉換為 Prisma enum
 */
export function toPrismaType(type: MessageTypeChinese): MessageType {
  return MESSAGE_TYPE_REVERSE_MAP[type];
}
