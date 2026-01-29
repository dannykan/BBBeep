/**
 * API Client Module
 * 平台無關的 API 客戶端
 */

// Client
export {
  initApiClient,
  getApiClient,
  getStorageAdapter,
  resetApiClient,
} from './client';

// Types
export type { StorageAdapter, ApiClientConfig, ApiError } from './types';

// Services
export {
  authApi,
  usersApi,
  messagesApi,
  pointsApi,
  aiApi,
  uploadApi,
  licensePlateApi,
  inviteApi,
  adminInviteApi,
  notificationsApi,
  activitiesApi,
  draftsApi,
  appContentApi,
  savedPlatesApi,
} from './services';

export type {
  UploadFile,
  AiModerationResponse,
  DevicePlatform,
  RegisterDeviceRequest,
  ActivityType,
  CreateActivityData,
  UserActivity,
  VoiceDraft,
  ParsedPlate,
  ParsedVehicle,
  ParsedEvent,
  DraftStatus,
  CreateDraftRequest,
  AppContentResponse,
  SavedPlate,
  RecentSentPlate,
  CheckSavedPlateResponse,
  CreateSavedPlateRequest,
  UpdateSavedPlateRequest,
} from './services';
