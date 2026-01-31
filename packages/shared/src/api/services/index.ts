/**
 * API Services - Re-export all services
 */

export { authApi } from './auth';
export { usersApi } from './users';
export { messagesApi } from './messages';
export { pointsApi, type VerifyIAPRequest, type VerifyIAPResponse } from './points';
export { aiApi, type AiModerationResponse } from './ai';
export { uploadApi, type UploadFile } from './upload';
export { licensePlateApi } from './license-plate';
export { inviteApi } from './invite';
export { adminInviteApi } from './admin-invite';
export { notificationsApi, type DevicePlatform, type RegisterDeviceRequest } from './notifications';
export {
  draftsApi,
  type VoiceDraft,
  type ParsedPlate,
  type ParsedVehicle,
  type ParsedEvent,
  type DraftStatus,
  type CreateDraftRequest,
  type UpdateDraftRequest,
} from './drafts';
export {
  activitiesApi,
  type ActivityType,
  type CreateActivityData,
  type UserActivity,
} from './activities';
export { appContentApi, type AppContentResponse } from './app-content';
export {
  savedPlatesApi,
  type SavedPlate,
  type RecentSentPlate,
  type CheckSavedPlateResponse,
  type CreateSavedPlateRequest,
  type UpdateSavedPlateRequest,
} from './saved-plates';
export { profanityApi, type ProfanityDictionary, type ProfanityVersion } from './profanity';
export { appVersionApi, type VersionCheckResponse } from './app-version';
