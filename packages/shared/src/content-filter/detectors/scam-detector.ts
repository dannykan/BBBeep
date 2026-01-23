/**
 * 詐騙/隱私檢測器
 * 檢測：銀行帳號、加密錢包地址、詐騙話術、身分證字號
 */

import type { Detector, Violation } from '../types';
import { VIOLATION_MESSAGES } from '../types';
import { normalizeNumbers } from '../normalizer';
import {
  BANK_ACCOUNT_PATTERN,
  CRYPTO_PATTERNS,
  TW_ID_PATTERN,
  CREDIT_CARD_PATTERN,
  isValidTaiwanId,
} from '../patterns';

/**
 * 詐騙相關關鍵字
 */
const SCAM_KEYWORDS = [
  // 金錢相關
  '匯款', '轉帳', '匯錢', '轉錢',
  '帳號', '帳戶', '銀行帳號', '銀行帳戶',
  '貸款', '借錢', '借款', '放款', '利息',
  '投資', '獲利', '報酬', '賺錢', '快速致富',
  '彩金', '獎金', '中獎', '得獎',

  // 加密貨幣
  '比特幣', '以太幣', 'usdt', 'btc', 'eth',
  '虛擬貨幣', '加密貨幣', '數位貨幣',
  '錢包地址', 'wallet', '區塊鏈',

  // 詐騙話術
  '解除分期', '訂單錯誤', '重複扣款', '退款',
  '客服', '客服人員', '銀行人員', '警察',
  '凍結', '凍結帳戶', '帳戶異常', '帳號異常',
  '認證', '驗證', '安全認證', '身份驗證',
  '提領', '提款', '代操', '代為操作',
  '點數', '遊戲點數', '儲值', // 在特定語境
];

/**
 * 檢測銀行帳號
 * 注意：需要搭配上下文判斷（例如有「匯款」「轉帳」關鍵字）
 */
function detectBankAccount(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];
  const lowerText = normalizedText.toLowerCase();

  // 檢查是否有金錢交易相關關鍵字
  const hasMoneyKeyword = SCAM_KEYWORDS.some(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );

  if (!hasMoneyKeyword) {
    return violations; // 沒有相關關鍵字，不檢測帳號
  }

  // 提取數字序列
  const numbers = normalizeNumbers(text);
  const matches = numbers.match(BANK_ACCOUNT_PATTERN);

  if (matches) {
    for (const match of matches) {
      // 銀行帳號通常是 10-16 位
      if (match.length >= 10 && match.length <= 16) {
        // 排除明顯不是帳號的數字（全部重複）
        if (!/^(.)\1+$/.test(match)) {
          violations.push({
            type: 'SCAM_BANK',
            severity: 'high',
            matched: match,
            message: VIOLATION_MESSAGES.SCAM_BANK,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * 檢測加密貨幣錢包地址
 */
function detectCryptoWallet(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];

  // 檢測 Bitcoin 地址
  const btcMatches = text.match(CRYPTO_PATTERNS.BTC);
  if (btcMatches) {
    for (const match of btcMatches) {
      violations.push({
        type: 'SCAM_CRYPTO',
        severity: 'high',
        matched: match,
        message: VIOLATION_MESSAGES.SCAM_CRYPTO,
      });
    }
  }

  // 檢測 Ethereum 地址
  const ethMatches = text.match(CRYPTO_PATTERNS.ETH);
  if (ethMatches) {
    for (const match of ethMatches) {
      violations.push({
        type: 'SCAM_CRYPTO',
        severity: 'high',
        matched: match,
        message: VIOLATION_MESSAGES.SCAM_CRYPTO,
      });
    }
  }

  // 檢測 TRC20 地址
  const trcMatches = text.match(CRYPTO_PATTERNS.TRC20);
  if (trcMatches) {
    for (const match of trcMatches) {
      violations.push({
        type: 'SCAM_CRYPTO',
        severity: 'high',
        matched: match,
        message: VIOLATION_MESSAGES.SCAM_CRYPTO,
      });
    }
  }

  return violations;
}

/**
 * 檢測詐騙關鍵字
 * 注意：單獨的關鍵字可能不足以判定詐騙，需要多個關鍵字同時出現
 */
function detectScamKeywords(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];
  const lowerText = normalizedText.toLowerCase();

  // 計算匹配到的詐騙關鍵字數量
  let matchCount = 0;
  let matchedKeywords: string[] = [];

  for (const keyword of SCAM_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchCount++;
      matchedKeywords.push(keyword);
    }
  }

  // 只有當匹配到多個詐騙關鍵字時才警告
  if (matchCount >= 3) {
    violations.push({
      type: 'SCAM_KEYWORD',
      severity: 'medium',
      matched: matchedKeywords.slice(0, 3).join('、'),
      message: VIOLATION_MESSAGES.SCAM_KEYWORD,
    });
  }

  return violations;
}

/**
 * 檢測身分證字號
 */
function detectIdNumber(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];

  // 在正規化後的文字中搜尋
  const matches = normalizedText.match(TW_ID_PATTERN);

  if (matches) {
    for (const match of matches) {
      // 驗證是否為有效的身分證字號
      if (isValidTaiwanId(match)) {
        violations.push({
          type: 'PRIVACY_ID',
          severity: 'high',
          matched: match,
          message: VIOLATION_MESSAGES.PRIVACY_ID,
        });
      }
    }
  }

  return violations;
}

/**
 * 檢測信用卡號
 */
function detectCreditCard(text: string, normalizedText: string): Violation[] {
  const violations: Violation[] = [];

  // 提取數字序列
  const numbers = normalizeNumbers(text);

  // 找出 16 位連續數字
  const matches = numbers.match(/\d{16}/g);

  if (matches) {
    for (const match of matches) {
      // Luhn 演算法驗證
      if (isValidCreditCard(match)) {
        violations.push({
          type: 'PRIVACY_CARD',
          severity: 'high',
          matched: match.replace(/(\d{4})/g, '$1 ').trim(),
          message: VIOLATION_MESSAGES.PRIVACY_CARD,
        });
      }
    }
  }

  return violations;
}

/**
 * Luhn 演算法驗證信用卡號
 */
function isValidCreditCard(number: string): boolean {
  if (!/^\d{16}$/.test(number)) return false;

  let sum = 0;
  let isEven = false;

  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * 詐騙/隱私檢測器
 */
export const scamDetector: Detector = {
  name: 'ScamDetector',

  detect(text: string, normalizedText: string): Violation[] {
    const violations: Violation[] = [];

    // 依序檢測各種詐騙/隱私相關內容
    // 身分證優先
    const idViolations = detectIdNumber(text, normalizedText);
    if (idViolations.length > 0) {
      violations.push(...idViolations);
    }

    // 信用卡
    const cardViolations = detectCreditCard(text, normalizedText);
    if (cardViolations.length > 0) {
      violations.push(...cardViolations);
    }

    // 加密錢包
    const cryptoViolations = detectCryptoWallet(text, normalizedText);
    if (cryptoViolations.length > 0) {
      violations.push(...cryptoViolations);
    }

    // 銀行帳號（需要上下文）
    const bankViolations = detectBankAccount(text, normalizedText);
    if (bankViolations.length > 0) {
      violations.push(...bankViolations);
    }

    // 詐騙關鍵字（需要多個同時出現）
    // 暫時停用，因為誤判率較高
    // const scamKeywordViolations = detectScamKeywords(text, normalizedText);
    // if (scamKeywordViolations.length > 0) {
    //   violations.push(...scamKeywordViolations);
    // }

    return violations;
  },
};

export default scamDetector;
