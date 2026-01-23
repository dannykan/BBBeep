/**
 * BBBeep 內容過濾系統型別定義
 */

/**
 * 違規類型
 */
export type ViolationType =
  | 'CONTACT_PHONE'      // 電話號碼
  | 'CONTACT_LINE'       // LINE ID
  | 'CONTACT_WECHAT'     // 微信
  | 'CONTACT_EMAIL'      // Email
  | 'CONTACT_URL'        // 網址/連結
  | 'CONTACT_SOCIAL'     // 社群帳號（IG、FB 等）
  | 'PROFANITY'          // 髒話/不當言語
  | 'THREAT'             // 威脅/恐嚇
  | 'HARASSMENT'         // 騷擾
  | 'DISCRIMINATION'     // 歧視
  | 'SCAM_BANK'          // 銀行帳號
  | 'SCAM_CRYPTO'        // 加密錢包地址
  | 'SCAM_KEYWORD'       // 詐騙話術關鍵字
  | 'PRIVACY_ID'         // 身分證字號
  | 'PRIVACY_CARD';      // 信用卡號

/**
 * 違規嚴重程度
 */
export type ViolationSeverity = 'low' | 'medium' | 'high';

/**
 * 單一違規項目
 */
export interface Violation {
  /** 違規類型 */
  type: ViolationType;
  /** 嚴重程度 */
  severity: ViolationSeverity;
  /** 匹配到的內容 */
  matched: string;
  /** 在原文中的位置 (start) */
  position?: number;
  /** 錯誤訊息（用於顯示給使用者） */
  message: string;
}

/**
 * 內容過濾結果
 */
export interface ContentFilterResult {
  /** 是否通過驗證（無違規） */
  isValid: boolean;
  /** 所有違規項目 */
  violations: Violation[];
  /** 正規化後的文字（用於檢測） */
  normalizedText: string;
  /** 原始文字 */
  originalText: string;
}

/**
 * 過濾選項
 */
export interface FilterOptions {
  /** 檢測聯繫方式 */
  checkContact?: boolean;
  /** 檢測不當言語 */
  checkProfanity?: boolean;
  /** 檢測詐騙/隱私資訊 */
  checkScam?: boolean;
  /** 最低嚴重程度（只回報此等級以上的違規） */
  minSeverity?: ViolationSeverity;
}

/**
 * 檢測器介面
 */
export interface Detector {
  /** 檢測器名稱 */
  name: string;
  /** 執行檢測 */
  detect(text: string, normalizedText: string): Violation[];
}

/**
 * 違規類型對應的錯誤訊息（繁體中文）
 */
export const VIOLATION_MESSAGES: Record<ViolationType, string> = {
  CONTACT_PHONE: '請勿包含電話號碼',
  CONTACT_LINE: '請勿包含 LINE ID 或相關資訊',
  CONTACT_WECHAT: '請勿包含微信帳號',
  CONTACT_EMAIL: '請勿包含電子郵件地址',
  CONTACT_URL: '請勿包含網址或連結',
  CONTACT_SOCIAL: '請勿包含社群帳號',
  PROFANITY: '請使用適當的語言',
  THREAT: '請勿包含威脅性言語',
  HARASSMENT: '請勿包含騷擾性言語',
  DISCRIMINATION: '請勿包含歧視性言語',
  SCAM_BANK: '請勿包含銀行帳號',
  SCAM_CRYPTO: '請勿包含加密錢包地址',
  SCAM_KEYWORD: '請勿包含可疑訊息',
  PRIVACY_ID: '請勿包含身分證字號',
  PRIVACY_CARD: '請勿包含信用卡資訊',
};

/**
 * 嚴重程度對應的權重（用於排序）
 */
export const SEVERITY_WEIGHT: Record<ViolationSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};
