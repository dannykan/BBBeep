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
  points: number;
  hasCompletedOnboarding: boolean;
  email?: string;
  blockedUsers?: BlockedUser[];
  rejectedUsers?: RejectedUser[];
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
