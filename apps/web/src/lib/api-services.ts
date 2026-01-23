/**
 * API Services for Web
 * Re-export from shared package with initialization
 */

// 確保 API Client 已初始化
import { ensureApiClientInitialized } from './api';
ensureApiClientInitialized();

// Re-export all API services from shared
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
} from '@bbbeeep/shared';
