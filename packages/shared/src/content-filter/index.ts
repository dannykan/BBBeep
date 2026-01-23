/**
 * BBBeep 內容過濾系統
 *
 * 用於阻擋髒話、詐騙訊息、聯繫方式、連結等不當內容
 * 能處理空白格分隔、諧音字等規避手法
 *
 * @example
 * import { filterContent, hasInappropriateContent } from '@bbbeeep/shared/content-filter';
 *
 * // 基本使用
 * const result = filterContent("你的車燈沒關");
 * console.log(result.isValid); // true
 *
 * // 檢測到違規
 * const result2 = filterContent("0 9 1 2 3 4 5 6 7 8");
 * console.log(result2.isValid); // false
 * console.log(result2.violations[0].message); // "請勿包含電話號碼"
 *
 * // 快速判斷
 * const hasIssue = hasInappropriateContent("幹你");
 * console.log(hasIssue); // true
 */

// 主過濾器
export {
  filterContent,
  quickFilter,
  fullFilter,
  hasInappropriateContent,
  getFilterErrorMessage,
  createContentFilterRefine,
  getContentFilterErrorMessage,
} from './content-filter';

// 型別
export type {
  ContentFilterResult,
  FilterOptions,
  Violation,
  ViolationType,
  ViolationSeverity,
  Detector,
} from './types';

export { VIOLATION_MESSAGES, SEVERITY_WEIGHT } from './types';

// 正規化工具（供進階使用）
export {
  normalize,
  normalizeLight,
  normalizeNumbers,
  extractNumberSequences,
  containsNormalized,
  removeWhitespace,
  removeSeparators,
  substituteChars,
  substituteWords,
} from './normalizer';

// 檢測器（供進階使用）
export { contactDetector } from './detectors/contact-detector';
export { profanityDetector } from './detectors/profanity-detector';
export { scamDetector } from './detectors/scam-detector';

// 模式（供進階使用）
export {
  TAIWAN_MOBILE_PATTERN,
  EMAIL_PATTERN,
  URL_PATTERNS,
  LINE_ID_PATTERN,
  TW_ID_PATTERN,
  isValidTaiwanMobile,
  isValidLineId,
  isValidTaiwanId,
  isPossiblePhone,
} from './patterns';

// 詞庫（供進階使用）
export * from './dictionaries';
