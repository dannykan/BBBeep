export type UserType = 'driver' | 'pedestrian';
export type VehicleType = 'car' | 'scooter';
export type MessageType = '車況提醒' | '行車安全提醒' | '讚美感謝';

export interface User {
  id: string;
  phone: string;
  nickname?: string;
  licensePlate?: string;
  userType: UserType;
  vehicleType?: VehicleType;
  points: number;        // 購買的點數
  freePoints: number;    // 每日免費點數
  hasCompletedOnboarding: boolean;
  email?: string;
  blockedUsers?: BlockedUser[];
  rejectedUsers?: RejectedUser[];
  // LINE 相關
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  isLineFriend?: boolean; // 是否已加入 LINE 官方帳號好友
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

export interface Message {
  id: string;
  type: MessageType;
  template: string;
  customText?: string;
  replyText?: string; // 回覆內容（僅供記錄）
  location?: string; // 事發地點
  occurredAt?: string; // 事發時間
  createdAt: string;
  read: boolean;
  sender?: {
    id: string;
    nickname?: string;
  };
}

export interface SentMessage {
  id: string;
  type: MessageType;
  template: string;
  customText?: string;
  replyText?: string; // 收件者的回覆
  location?: string; // 事發地點
  occurredAt?: string; // 事發時間
  createdAt: string;
  read: boolean;
  receiver: {
    id: string;
    nickname?: string;
    licensePlate?: string;
  };
}

export interface PointHistory {
  id: string;
  type: 'recharge' | 'spend' | 'earn' | 'bonus';
  amount: number;
  description: string;
  createdAt: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

// Invite Types
export type InviteStatus = 'pending' | 'completed' | 'expired';

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
  status: InviteStatus;
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
  status: InviteStatus;
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
    status: InviteStatus;
    inviterReward: number;
    inviteeReward: number;
    createdAt: string;
    rewardedAt?: string;
  }[];
}
