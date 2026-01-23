/**
 * BBBeep 共用常數定義
 */

// ============================================
// 訊息類型
// ============================================

export const MESSAGE_TYPES = [
  '車況提醒',
  '行車安全提醒',
  '讚美感謝',
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  '車況提醒': '車況提醒',
  '行車安全提醒': '行車安全提醒',
  '讚美感謝': '讚美感謝',
};

// ============================================
// 用戶類型
// ============================================

export const USER_TYPES = ['driver', 'pedestrian'] as const;

export type UserType = (typeof USER_TYPES)[number];

export const USER_TYPE_LABELS: Record<UserType, string> = {
  driver: '駕駛',
  pedestrian: '行人',
};

// ============================================
// 車輛類型
// ============================================

export const VEHICLE_TYPES = ['car', 'scooter'] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: '汽車',
  scooter: '機車',
};

// ============================================
// 點數歷史類型
// ============================================

export const POINT_HISTORY_TYPES = [
  'recharge',
  'spend',
  'earn',
  'bonus',
] as const;

export type PointHistoryType = (typeof POINT_HISTORY_TYPES)[number];

export const POINT_HISTORY_TYPE_LABELS: Record<PointHistoryType, string> = {
  recharge: '儲值',
  spend: '消費',
  earn: '獲得',
  bonus: '獎勵',
};

// ============================================
// 邀請狀態
// ============================================

export const INVITE_STATUSES = [
  'pending',
  'completed',
  'expired',
] as const;

export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  pending: '待完成',
  completed: '已完成',
  expired: '已過期',
};

// ============================================
// 點數相關常數
// ============================================

export const POINTS = {
  /** 每日免費點數 */
  DAILY_FREE_POINTS: 2,
  /** 發送訊息消耗點數 */
  SEND_MESSAGE_COST: 1,
  /** 收到讚美獲得點數 */
  RECEIVE_PRAISE_REWARD: 1,
  /** 預設邀請人獎勵 */
  DEFAULT_INVITER_REWARD: 10,
  /** 預設被邀請人獎勵 */
  DEFAULT_INVITEE_REWARD: 10,
} as const;

// ============================================
// 車牌相關常數
// ============================================

export const LICENSE_PLATE = {
  /** 最小長度 */
  MIN_LENGTH: 3,
  /** 最大長度 */
  MAX_LENGTH: 8,
} as const;

// ============================================
// AI 相關常數
// ============================================

export const AI = {
  /** 每日 AI 改寫次數限制 */
  DAILY_REWRITE_LIMIT: 5,
} as const;

// ============================================
// 驗證相關常數
// ============================================

export const VALIDATION = {
  /** 暱稱最大長度 */
  NICKNAME_MAX_LENGTH: 12,
  /** 密碼最小長度 */
  PASSWORD_MIN_LENGTH: 6,
  /** 密碼最大長度 */
  PASSWORD_MAX_LENGTH: 12,
  /** 驗證碼長度 */
  VERIFY_CODE_LENGTH: 6,
  /** 每日驗證碼發送次數限制 */
  DAILY_VERIFY_LIMIT: 5,
  /** 驗證碼錯誤嘗試次數限制 */
  VERIFY_ERROR_LIMIT: 5,
  /** 邀請碼長度 */
  INVITE_CODE_LENGTH: 6,
} as const;

// ============================================
// LINE 相關常數
// ============================================

export const LINE = {
  /** LINE 官方帳號 ID */
  OFFICIAL_ACCOUNT_ID: '@556vmzwz',
  /** LINE 官方帳號 URL */
  get OFFICIAL_ACCOUNT_URL() {
    return `https://line.me/R/ti/p/${this.OFFICIAL_ACCOUNT_ID}`;
  },
} as const;
