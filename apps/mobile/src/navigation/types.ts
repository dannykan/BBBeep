/**
 * Navigation Types
 */

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
  Wallet: undefined;
  Sent: undefined;
  InviteFriends: undefined;
  BlockList: undefined;
  EditProfile: undefined;
  LicensePlateChange: undefined;
  NotificationSettings: undefined;
  Appearance: undefined;
  Legal: { type: 'terms' | 'privacy' };
  QuickRecord: undefined;
};

export type OnboardingStackParamList = {
  UserType: undefined;
  LicensePlate: undefined;
  Nickname: undefined;
  PointsExplanation: undefined;
  InviteCode: undefined;
  Welcome: undefined;
};

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  VerifyCode: { phone: string };
  SetPassword: { phone: string; code: string };
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Send: undefined;
  Inbox: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
};

export type SendStackParamList = {
  // V2 流程（優化版 4 步驟）
  PlateInput: undefined;
  Category: undefined;
  MessageEdit: { category?: string };
  Confirm: undefined;
  Success: undefined;
  // V1 流程（保留舊版相容性）
  VehicleType: undefined;
  Situation: undefined;
  Review: undefined;
  Custom: undefined;
  AiSuggest: undefined;
};

export type InboxStackParamList = {
  InboxScreen: undefined;
  MessageDetail: { messageId: string };
};

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  BlockList: undefined;
  Wallet: undefined;
  InviteCode: undefined;
};
