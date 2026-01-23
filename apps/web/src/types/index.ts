/**
 * Types - Re-export from shared package
 * 保持向後兼容，現有的 import 不需要更改
 */
export * from '@bbbeeep/shared';

// Re-export only types (not constants or utils)
export type {
  UserType,
  VehicleType,
  MessageType,
  PointHistoryType,
  InviteStatus,
  User,
  BlockedUser,
  RejectedUser,
  Message,
  SentMessage,
  PointHistory,
  LoginResponse,
  CheckPhoneResponse,
  VerifyPhoneResponse,
  InviteCodeResponse,
  ValidateCodeResponse,
  ApplyInviteCodeResponse,
  InviteHistoryItem,
  InviteSettings,
  InviteStatistics,
  AdminInviteHistoryItem,
  UserInviteStats,
  LicensePlateCheckResponse,
  AiLimitResponse,
  AiRewriteResponse,
  UploadResponse,
} from '@bbbeeep/shared';
