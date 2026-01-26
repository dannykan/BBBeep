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
  activitiesApi,
} from './services';

export type { UploadFile, AiModerationResponse, ActivityType, CreateActivityData, UserActivity } from './services';
