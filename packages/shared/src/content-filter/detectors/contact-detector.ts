/**
 * 聯繫方式檢測器
 * 檢測：電話號碼、LINE ID、微信、Email、URL、社群帳號
 */

import type { Detector, Violation } from '../types';
import { VIOLATION_MESSAGES } from '../types';
import { normalize, normalizeNumbers, extractNumberSequences } from '../normalizer';
import {
  TAIWAN_MOBILE_PATTERN,
  EMAIL_PATTERN,
  URL_PATTERNS,
  LINE_ID_PATTERN,
  SOCIAL_HANDLE_PATTERN,
  isPossiblePhone,
  isValidLineId,
} from '../patterns';
import {
  hasLineContent,
  hasSocialContent,
  findContactKeyword,
  WECHAT_KEYWORDS,
} from '../dictionaries/contact-keywords';

/**
 * 檢測電話號碼
 */
function detectPhone(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];

  // 從正規化後的文字中提取數字序列
  const numberSequences = extractNumberSequences(text);

  for (const seq of numberSequences) {
    // 只檢測 7 位以上的數字序列
    if (seq.length >= 8 && isPossiblePhone(seq)) {
      violations.push({
        type: 'CONTACT_PHONE',
        severity: 'high',
        matched: seq,
        message: VIOLATION_MESSAGES.CONTACT_PHONE,
      });
    }
  }

  // 也檢查正規化後的文字中是否有台灣手機格式
  const normalizedNumbers = normalizeNumbers(normalizedText);
  const mobileMatches = normalizedNumbers.match(TAIWAN_MOBILE_PATTERN);
  if (mobileMatches) {
    for (const match of mobileMatches) {
      // 避免重複
      if (!violations.some(v => v.matched === match)) {
        violations.push({
          type: 'CONTACT_PHONE',
          severity: 'high',
          matched: match,
          message: VIOLATION_MESSAGES.CONTACT_PHONE,
        });
      }
    }
  }

  return violations;
}

/**
 * 檢測 LINE ID
 */
function detectLine(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];

  // 檢查是否有 LINE 相關關鍵字
  const lineKeyword = hasLineContent(normalizedText);
  if (lineKeyword) {
    // 有關鍵字時，嘗試找出後面的 ID
    // 例如：「加我賴 abc123」
    const idMatches = normalizedText.match(LINE_ID_PATTERN);
    if (idMatches) {
      for (const match of idMatches) {
        if (isValidLineId(match)) {
          violations.push({
            type: 'CONTACT_LINE',
            severity: 'high',
            matched: match,
            message: VIOLATION_MESSAGES.CONTACT_LINE,
          });
        }
      }
    }

    // 即使沒找到有效 ID，有關鍵字也要警告
    if (violations.length === 0) {
      violations.push({
        type: 'CONTACT_LINE',
        severity: 'medium',
        matched: lineKeyword,
        message: VIOLATION_MESSAGES.CONTACT_LINE,
      });
    }
  }

  return violations;
}

/**
 * 檢測微信
 */
function detectWechat(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];
  const lowerText = normalizedText.toLowerCase();

  for (const keyword of WECHAT_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      violations.push({
        type: 'CONTACT_WECHAT',
        severity: 'medium',
        matched: keyword,
        message: VIOLATION_MESSAGES.CONTACT_WECHAT,
      });
      break; // 只需要一個違規
    }
  }

  return violations;
}

/**
 * 檢測 Email
 */
function detectEmail(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];

  // 在原文中搜尋（Email 格式不太會被分隔）
  const matches = text.match(EMAIL_PATTERN);
  if (matches) {
    for (const match of matches) {
      violations.push({
        type: 'CONTACT_EMAIL',
        severity: 'high',
        matched: match,
        message: VIOLATION_MESSAGES.CONTACT_EMAIL,
      });
    }
  }

  return violations;
}

/**
 * 檢測 URL
 */
function detectUrl(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];

  // 在原文和正規化後的文字都搜尋
  const textsToCheck = [text, normalizedText];

  for (const textToCheck of textsToCheck) {
    for (const pattern of URL_PATTERNS) {
      const matches = textToCheck.match(pattern);
      if (matches) {
        for (const match of matches) {
          // 避免重複
          if (!violations.some(v => v.matched.toLowerCase() === match.toLowerCase())) {
            violations.push({
              type: 'CONTACT_URL',
              severity: 'high',
              matched: match,
              message: VIOLATION_MESSAGES.CONTACT_URL,
            });
          }
        }
      }
    }
  }

  return violations;
}

/**
 * 檢測社群帳號
 */
function detectSocial(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];

  // 檢查社群平台關鍵字
  const socialKeyword = hasSocialContent(normalizedText);
  if (socialKeyword) {
    // 檢查是否有 @handle 格式
    const handleMatches = text.match(SOCIAL_HANDLE_PATTERN);
    if (handleMatches) {
      for (const match of handleMatches) {
        violations.push({
          type: 'CONTACT_SOCIAL',
          severity: 'high',
          matched: match,
          message: VIOLATION_MESSAGES.CONTACT_SOCIAL,
        });
      }
    }

    // 即使沒有 handle，有平台關鍵字也警告
    if (violations.length === 0) {
      violations.push({
        type: 'CONTACT_SOCIAL',
        severity: 'medium',
        matched: socialKeyword,
        message: VIOLATION_MESSAGES.CONTACT_SOCIAL,
      });
    }
  }

  // 也檢查是否有交換聯繫方式的關鍵字
  const contactKeyword = findContactKeyword(normalizedText);
  if (contactKeyword && violations.length === 0) {
    // 如果已經有其他違規就不重複加
    violations.push({
      type: 'CONTACT_SOCIAL',
      severity: 'low',
      matched: contactKeyword,
      message: '請勿索取或提供聯繫方式',
    });
  }

  return violations;
}

/**
 * 聯繫方式檢測器
 */
export const contactDetector: Detector = {
  name: 'ContactDetector',

  detect(text: string, normalizedText: string): Violation[] {
    const violations: Violation[] = [];

    // 依序檢測各種聯繫方式
    violations.push(...detectPhone(text, normalizedText));
    violations.push(...detectLine(text, normalizedText));
    violations.push(...detectWechat(text, normalizedText));
    violations.push(...detectEmail(text, normalizedText));
    violations.push(...detectUrl(text, normalizedText));
    violations.push(...detectSocial(text, normalizedText));

    return violations;
  },
};

export default contactDetector;
