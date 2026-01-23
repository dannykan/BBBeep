/**
 * BBBeep 共用驗證 Schema (Zod)
 */

import { z } from 'zod';
import { VALIDATION, MESSAGE_TYPES, USER_TYPES, VEHICLE_TYPES } from '../constants';
import { normalizeLicensePlate } from '../utils/license-plate';
import {
  filterContent,
  createContentFilterRefine,
  getContentFilterErrorMessage,
} from '../content-filter';

// ============================================
// 基礎 Schema
// ============================================

export const userTypeSchema = z.enum(USER_TYPES);
export const vehicleTypeSchema = z.enum(VEHICLE_TYPES);
export const messageTypeSchema = z.enum(MESSAGE_TYPES);

// ============================================
// 認證相關 Schema
// ============================================

export const phoneSchema = z
  .string()
  .regex(/^09\d{8}$/, '請輸入有效的台灣手機號碼');

export const verifyCodeSchema = z
  .string()
  .length(VALIDATION.VERIFY_CODE_LENGTH, `驗證碼必須是 ${VALIDATION.VERIFY_CODE_LENGTH} 位數字`);

export const passwordSchema = z
  .string()
  .min(VALIDATION.PASSWORD_MIN_LENGTH, `密碼至少 ${VALIDATION.PASSWORD_MIN_LENGTH} 個字元`)
  .max(VALIDATION.PASSWORD_MAX_LENGTH, `密碼最多 ${VALIDATION.PASSWORD_MAX_LENGTH} 個字元`)
  .regex(/^[a-zA-Z0-9]+$/, '密碼只能包含英文字母和數字');

export const loginSchema = z.object({
  phone: phoneSchema,
  code: verifyCodeSchema,
});

export const passwordLoginSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

export const setPasswordSchema = z.object({
  phone: phoneSchema,
  code: verifyCodeSchema,
  password: passwordSchema,
});

// ============================================
// 用戶相關 Schema
// ============================================

export const nicknameSchema = z
  .string()
  .max(VALIDATION.NICKNAME_MAX_LENGTH, `暱稱最多 ${VALIDATION.NICKNAME_MAX_LENGTH} 個字`)
  .optional();

export const licensePlateSchema = z
  .string()
  .refine((val) => normalizeLicensePlate(val) !== null, {
    message: '請輸入有效的車牌號碼',
  });

export const updateUserSchema = z.object({
  nickname: nicknameSchema,
  email: z.string().email('請輸入有效的 Email').optional(),
});

export const completeOnboardingSchema = z.object({
  userType: userTypeSchema,
  vehicleType: vehicleTypeSchema.optional(),
  licensePlate: z.string().optional(),
  nickname: nicknameSchema,
});

// ============================================
// 內容過濾 Schema
// ============================================

/**
 * 帶內容過濾的文字 Schema
 * 用於檢測不當內容（髒話、聯繫方式、詐騙等）
 */
export const filteredTextSchema = z
  .string()
  .refine(
    createContentFilterRefine(),
    (val) => ({ message: getContentFilterErrorMessage(val) })
  );

/**
 * 可選的帶內容過濾文字 Schema
 */
export const optionalFilteredTextSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || createContentFilterRefine()(val),
    (val) => ({ message: val ? getContentFilterErrorMessage(val) : '' })
  );

// ============================================
// 訊息相關 Schema
// ============================================

/**
 * 訊息內容 Schema（帶內容過濾）
 */
export const messageContentSchema = z
  .string()
  .min(1, '請輸入訊息內容')
  .max(200, '訊息內容最多 200 字')
  .refine(
    createContentFilterRefine(),
    (val) => ({ message: getContentFilterErrorMessage(val) })
  );

/**
 * 自訂文字 Schema（帶內容過濾，可選）
 */
export const customTextSchema = z
  .string()
  .max(200, '自訂內容最多 200 字')
  .optional()
  .refine(
    (val) => !val || createContentFilterRefine()(val),
    (val) => ({ message: val ? getContentFilterErrorMessage(val) : '' })
  );

export const createMessageSchema = z.object({
  licensePlate: licensePlateSchema,
  type: messageTypeSchema,
  template: z.string().min(1, '請選擇提醒內容'),
  customText: customTextSchema,
  useAiRewrite: z.boolean().optional(),
  location: z.string().max(100, '地點最多 100 字').optional(),
  occurredAt: z.string().optional(),
});

export const replyMessageSchema = z.object({
  replyText: z
    .string()
    .min(1, '請輸入回覆內容')
    .max(200, '回覆內容最多 200 字')
    .refine(
      createContentFilterRefine(),
      (val) => ({ message: getContentFilterErrorMessage(val) })
    ),
  isQuickReply: z.boolean().optional(),
  useAiRewrite: z.boolean().optional(),
});

// ============================================
// 邀請碼相關 Schema
// ============================================

export const inviteCodeSchema = z
  .string()
  .length(VALIDATION.INVITE_CODE_LENGTH, `邀請碼必須是 ${VALIDATION.INVITE_CODE_LENGTH} 位`)
  .regex(/^[A-Z0-9]+$/, '邀請碼格式錯誤');

export const applyInviteCodeSchema = z.object({
  code: inviteCodeSchema,
});

// ============================================
// 車牌申請相關 Schema
// ============================================

export const licensePlateApplicationSchema = z.object({
  licensePlate: licensePlateSchema,
  vehicleType: vehicleTypeSchema.optional(),
  licenseImage: z.string().url('請上傳有效的圖片').optional(),
  email: z.string().email('請輸入有效的 Email').optional(),
});

// ============================================
// AI 相關 Schema
// ============================================

export const aiRewriteSchema = z.object({
  text: z.string().min(1, '請輸入要改寫的內容').max(500, '內容最多 500 字'),
  vehicleType: vehicleTypeSchema.optional(),
  category: z.string().optional(),
});

// ============================================
// 型別導出 (從 Schema 推導)
// 注意：這些型別名稱與 types/index.ts 不衝突
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
export type CreateMessageValidatedInput = z.infer<typeof createMessageSchema>;
export type ReplyMessageInput = z.infer<typeof replyMessageSchema>;
export type ApplyInviteCodeInput = z.infer<typeof applyInviteCodeSchema>;
export type LicensePlateApplicationValidatedInput = z.infer<typeof licensePlateApplicationSchema>;
export type AiRewriteInput = z.infer<typeof aiRewriteSchema>;
