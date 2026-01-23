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
  VehicleType: undefined;
  PlateInput: undefined;
  Category: undefined;
  Situation: undefined;
  Review: undefined;
  Custom: undefined;
  AiSuggest: undefined;
  Confirm: undefined;
  Success: undefined;
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
