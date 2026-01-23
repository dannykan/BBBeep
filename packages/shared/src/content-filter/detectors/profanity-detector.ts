/**
 * 不當言語檢測器
 * 檢測：髒話、威脅、騷擾、歧視
 */

import type { Detector, Violation, ViolationType, ViolationSeverity } from '../types';
import { VIOLATION_MESSAGES } from '../types';
import {
  ALL_PROFANITY,
  THREAT_WORDS,
  HARASSMENT_WORDS,
  DISCRIMINATION_WORDS,
  hasHighSeverityWord,
  findProfanity,
  getProfanitySeverity,
} from '../dictionaries/profanity';

/**
 * 檢測威脅性言語
 */
function detectThreats(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];
  const lowerText = normalizedText.toLowerCase();

  for (const word of THREAT_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      violations.push({
        type: 'THREAT',
        severity: 'high',
        matched: word,
        message: VIOLATION_MESSAGES.THREAT,
      });
      // 威脅性言語只需回報一次
      break;
    }
  }

  return violations;
}

/**
 * 檢測騷擾性言語
 * 注意：在 BBBeep（提醒平台）語境下，某些詞彙可能構成騷擾
 */
function detectHarassment(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];
  const lowerText = normalizedText.toLowerCase();

  // 計算匹配到的騷擾關鍵字數量
  let matchCount = 0;
  let matchedWord = '';

  for (const word of HARASSMENT_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      matchCount++;
      if (!matchedWord) matchedWord = word;
    }
  }

  // 只有在匹配多個騷擾關鍵字時才判定（避免誤判）
  if (matchCount >= 2) {
    violations.push({
      type: 'HARASSMENT',
      severity: 'medium',
      matched: matchedWord,
      message: VIOLATION_MESSAGES.HARASSMENT,
    });
  }

  return violations;
}

/**
 * 檢測歧視性言語
 */
function detectDiscrimination(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];
  const lowerText = normalizedText.toLowerCase();

  for (const word of DISCRIMINATION_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      violations.push({
        type: 'DISCRIMINATION',
        severity: 'medium',
        matched: word,
        message: VIOLATION_MESSAGES.DISCRIMINATION,
      });
      break; // 只需回報一次
    }
  }

  return violations;
}

/**
 * 檢測髒話
 */
function detectProfanity(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];

  // 先檢查高嚴重度詞彙
  const highSeverityWord = hasHighSeverityWord(normalizedText);
  if (highSeverityWord) {
    violations.push({
      type: 'PROFANITY',
      severity: 'high',
      matched: highSeverityWord,
      message: VIOLATION_MESSAGES.PROFANITY,
    });
    return violations; // 高嚴重度就不需要再檢查了
  }

  // 檢查一般髒話
  const profanityWord = findProfanity(normalizedText);
  if (profanityWord) {
    const severity = getProfanitySeverity(profanityWord);
    violations.push({
      type: 'PROFANITY',
      severity,
      matched: profanityWord,
      message: VIOLATION_MESSAGES.PROFANITY,
    });
  }

  return violations;
}

/**
 * 不當言語檢測器
 */
export const profanityDetector: Detector = {
  name: 'ProfanityDetector',

  detect(text: string, normalizedText: string): Violation[] {
    const violations: Violation[] = [];

    // 依序檢測各種不當言語
    // 威脅性言語優先級最高
    const threats = detectThreats(text, normalizedText);
    if (threats.length > 0) {
      violations.push(...threats);
    }

    // 髒話
    const profanity = detectProfanity(text, normalizedText);
    if (profanity.length > 0) {
      violations.push(...profanity);
    }

    // 歧視
    const discrimination = detectDiscrimination(text, normalizedText);
    if (discrimination.length > 0) {
      violations.push(...discrimination);
    }

    // 騷擾（在提醒平台語境下較嚴格）
    // 暫時停用騷擾檢測，因為誤判率較高
    // const harassment = detectHarassment(text, normalizedText);
    // if (harassment.length > 0) {
    //   violations.push(...harassment);
    // }

    return violations;
  },
};

export default profanityDetector;
