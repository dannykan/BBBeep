/**
 * BBBeep 內容過濾器
 * 主過濾器，整合所有檢測器
 */

import type {
  ContentFilterResult,
  FilterOptions,
  Violation,
  ViolationSeverity,
} from './types';
import { SEVERITY_WEIGHT } from './types';
import { normalize } from './normalizer';
import { contactDetector } from './detectors/contact-detector';
import { profanityDetector } from './detectors/profanity-detector';
import { scamDetector } from './detectors/scam-detector';

/**
 * 預設過濾選項
 */
const DEFAULT_OPTIONS: Required<FilterOptions> = {
  checkContact: true,
  checkProfanity: true,
  checkScam: true,
  minSeverity: 'low',
};

/**
 * 比較嚴重程度
 * @returns 正數表示 a 比 b 嚴重
 */
function compareSeverity(a: ViolationSeverity, b: ViolationSeverity): number {
  return SEVERITY_WEIGHT[a] - SEVERITY_WEIGHT[b];
}

/**
 * 過濾違規項目（根據最低嚴重程度）
 */
function filterBySeverity(
  violations: Violation[],
  minSeverity: ViolationSeverity
): Violation[] {
  return violations.filter(v => compareSeverity(v.severity, minSeverity) >= 0);
}

/**
 * 對違規項目排序（嚴重程度高的排前面）
 */
function sortViolations(violations: Violation[]): Violation[] {
  return [...violations].sort((a, b) =>
    compareSeverity(b.severity, a.severity)
  );
}

/**
 * 去除重複的違規項目
 */
function dedupeViolations(violations: Violation[]): Violation[] {
  const seen = new Set<string>();
  return violations.filter(v => {
    const key = `${v.type}:${v.matched.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 執行內容過濾
 *
 * @param text 要檢測的文字
 * @param options 過濾選項
 * @returns 過濾結果
 *
 * @example
 * const result = filterContent("0 9 1 2 3 4 5 6 7 8");
 * if (!result.isValid) {
 *   console.log(result.violations[0].message);
 *   // "請勿包含電話號碼"
 * }
 */
export function filterContent(
  text: string,
  options: FilterOptions = {}
): ContentFilterResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 正規化文字
  const normalizedText = normalize(text);

  // 收集所有違規
  const violations: Violation[] = [];

  // 執行各檢測器
  if (opts.checkContact) {
    violations.push(...contactDetector.detect(text, normalizedText));
  }

  if (opts.checkProfanity) {
    violations.push(...profanityDetector.detect(text, normalizedText));
  }

  if (opts.checkScam) {
    violations.push(...scamDetector.detect(text, normalizedText));
  }

  // 過濾、去重、排序
  let filteredViolations = filterBySeverity(violations, opts.minSeverity);
  filteredViolations = dedupeViolations(filteredViolations);
  filteredViolations = sortViolations(filteredViolations);

  return {
    isValid: filteredViolations.length === 0,
    violations: filteredViolations,
    normalizedText,
    originalText: text,
  };
}

/**
 * 快速檢測（只檢測高嚴重度違規）
 * 適用於即時輸入驗證
 */
export function quickFilter(text: string): ContentFilterResult {
  return filterContent(text, { minSeverity: 'high' });
}

/**
 * 完整檢測（檢測所有違規）
 * 適用於提交前驗證
 */
export function fullFilter(text: string): ContentFilterResult {
  return filterContent(text, { minSeverity: 'low' });
}

/**
 * 檢測是否包含不當內容
 * 簡單的布林值回傳，用於快速判斷
 */
export function hasInappropriateContent(text: string): boolean {
  const result = filterContent(text);
  return !result.isValid;
}

/**
 * 取得違規的錯誤訊息
 * 回傳第一個違規的訊息，適用於顯示給使用者
 */
export function getFilterErrorMessage(text: string): string | null {
  const result = filterContent(text);
  if (result.isValid) {
    return null;
  }
  return result.violations[0]?.message || '內容包含不當資訊';
}

/**
 * 建立 Zod 驗證用的 refine 函數
 */
export function createContentFilterRefine() {
  return (text: string) => {
    const result = filterContent(text);
    return result.isValid;
  };
}

/**
 * 建立 Zod 驗證用的錯誤訊息函數
 */
export function getContentFilterErrorMessage(text: string): string {
  const result = filterContent(text);
  if (result.isValid) {
    return '';
  }
  return result.violations[0]?.message || '內容包含不當資訊';
}

export default filterContent;
