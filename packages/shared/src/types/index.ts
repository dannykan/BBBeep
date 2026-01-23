/**
 * BBBeep 共用型別定義
 * 供 Web、Mobile、API 共用
 */

// Re-export base types from constants
export type {
  UserType,
  VehicleType,
  MessageType,
  PointHistoryType,
  InviteStatus,
} from '../constants';

// ============================================
// 用戶相關
// ============================================

export interface User {
  id: string;
  phone?: string;
  nickname?: string;
  licensePlate?: string;
  userType: 'driver' | 'pedestrian';
  vehicleType?: 'car' | 'scooter';
  points: number;       // 購買/邀請獎勵點數（永久累積）
  freePoints: number;   // 每日免費點數（試用結束後每日重置）
  trialPoints: number;  // 試用期點數（一次性發放，用完不補）
  hasCompletedOnboarding: boolean;
  email?: string;
  blockedUsers?: BlockedUser[];
  rejectedUsers?: RejectedUser[];
  // LINE 相關
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  isLineFriend?: boolean;
  // Apple Sign-In 相關
  appleUserId?: string;
  appleEmail?: string;
  // 試用期相關
  trialStartDate?: string;
  trialEndedProcessed?: boolean;
}

export interface BlockedUser {
  id: string;
  blocked: {
    id: string;
    nickname?: string;
  };
}

export interface RejectedUser {
  id: string;
  rejected: {
    id: string;
    nickname?: string;
  };
}

// ============================================
// 訊息相關
// ============================================

export interface Message {
  id: string;
  type: '車況提醒' | '行車安全提醒' | '讚美感謝';
  template: string;
  customText?: string;
  replyText?: string;
  location?: string;
  occurredAt?: string;
  createdAt: string;
  read: boolean;
  sender?: {
    id: string;
    nickname?: string;
  };
}

export interface SentMessage {
  id: string;
  type: '車況提醒' | '行車安全提醒' | '讚美感謝';
  template: string;
  customText?: string;
  replyText?: string;
  location?: string;
  occurredAt?: string;
  createdAt: string;
  read: boolean;
  receiver: {
    id: string;
    nickname?: string;
    licensePlate?: string;
  };
}

// ============================================
// 點數相關
// ============================================

export interface PointHistory {
  id: string;
  type: 'recharge' | 'spend' | 'earn' | 'bonus';
  amount: number;
  description: string;
  createdAt: string;
}

// ============================================
// 認證相關
// ============================================

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface CheckPhoneResponse {
  exists: boolean;
  hasPassword: boolean;
}

export interface VerifyPhoneResponse {
  message: string;
  code?: string;
  remaining?: number;
}

// ============================================
// 邀請碼相關
// ============================================

export interface InviteCodeResponse {
  inviteCode: string;
  inviteCount: number;
  totalRewards: number;
  inviterReward: number;
  inviteeReward: number;
}

export interface ValidateCodeResponse {
  valid: boolean;
  inviterNickname?: string;
  inviteeReward?: number;
  message?: string;
}

export interface ApplyInviteCodeResponse {
  success: boolean;
  inviterNickname: string;
  inviteeReward: number;
}

export interface InviteHistoryItem {
  id: string;
  inviteeNickname: string;
  status: 'pending' | 'completed' | 'expired';
  reward: number;
  createdAt: string;
  rewardedAt?: string;
}

export interface InviteSettings {
  id: string;
  defaultInviterReward: number;
  defaultInviteeReward: number;
  isEnabled: boolean;
  updatedAt: string;
}

export interface InviteStatistics {
  totalInvites: number;
  completedInvites: number;
  pendingInvites: number;
  expiredInvites: number;
  totalInviterRewards: number;
  totalInviteeRewards: number;
  totalRewardsDistributed: number;
}

export interface AdminInviteHistoryItem {
  id: string;
  inviterId: string;
  inviteeId: string;
  inviteCode: string;
  status: 'pending' | 'completed' | 'expired';
  inviterReward: number;
  inviteeReward: number;
  rewardedAt?: string;
  createdAt: string;
  inviter: {
    id: string;
    phone?: string;
    nickname?: string;
    licensePlate?: string;
  };
  invitee: {
    id: string;
    phone?: string;
    nickname?: string;
    licensePlate?: string;
  };
}

export interface UserInviteStats {
  inviteCode?: string;
  customInviterReward?: number;
  customInviteeReward?: number;
  effectiveInviterReward: number;
  effectiveInviteeReward: number;
  invitedBy?: {
    id: string;
    nickname?: string;
  };
  inviteCount: number;
  pendingCount: number;
  totalRewards: number;
  inviteHistory: {
    id: string;
    inviteeNickname: string;
    status: 'pending' | 'completed' | 'expired';
    inviterReward: number;
    inviteeReward: number;
    createdAt: string;
    rewardedAt?: string;
  }[];
}

// ============================================
// 車牌相關
// ============================================

export interface LicensePlateCheckResponse {
  available: boolean;
  isBound: boolean;
  boundPhone?: string;
  boundNickname?: string;
  hasPendingApplication?: boolean;
}

// ============================================
// AI 相關
// ============================================

export interface AiLimitResponse {
  canUse: boolean;
  remaining: number;
}

export interface AiRewriteResponse {
  rewritten: string;
}

// ============================================
// 上傳相關
// ============================================

export interface UploadResponse {
  url: string;
  filename: string;
  originalname: string;
  size: number;
}

// ============================================
// 試用期相關
// ============================================

export interface TrialStatusResponse {
  isInTrial: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  daysRemaining: number;
  trialDurationDays: number;
  trialEndedProcessed: boolean;
  trialConfig: {
    initialPoints: number;
    oneTimeBonusAfterTrial: number;
  };
}
