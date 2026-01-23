/**
 * 正則表達式模式
 * 用於檢測各種違規內容
 */

/**
 * 台灣手機號碼（正規化後）
 * 格式：09xxxxxxxx（10位）
 */
export const TAIWAN_MOBILE_PATTERN = /09\d{8}/g;

/**
 * 台灣市話（正規化後）
 * 格式：02-8碼, 03-7碼, 04-8碼, 05-7碼, 06-7碼, 07-7碼, 08-7碼, 089-6碼
 */
export const TAIWAN_LANDLINE_PATTERN = /0[2-9]\d{7,8}/g;

/**
 * 國際電話格式
 * +886, 886 開頭
 */
export const INTL_PHONE_PATTERN = /\+?886\d{9,10}/g;

/**
 * 一般電話號碼模式（7-12位連續數字）
 * 用於寬鬆檢測
 */
export const GENERIC_PHONE_PATTERN = /\d{7,12}/g;

/**
 * LINE ID 格式
 * 4-20 字元，字母開頭，可包含字母、數字、底線、句點
 */
export const LINE_ID_PATTERN = /[a-z][a-z0-9._]{3,19}/gi;

/**
 * Email 格式
 */
export const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/**
 * URL 格式（含縮網址）
 */
export const URL_PATTERNS = [
  // 標準 URL
  /https?:\/\/[^\s<>"\u4e00-\u9fff]+/gi,
  // 無 protocol 的常見域名
  /(?:www\.)[^\s<>"\u4e00-\u9fff]+/gi,
  // 縮網址服務
  /(?:bit\.ly|goo\.gl|tinyurl\.com|t\.co|reurl\.cc|lihi\.cc|pse\.is|is\.gd|v\.gd|ow\.ly|buff\.ly|shorturl\.at|cutt\.ly)\/[a-z0-9]+/gi,
  // 常見頂級域名
  /[a-z0-9-]+\.(?:com|net|org|io|me|tw|co|app|dev|link|site|online|shop|store|info|biz|xyz|top|cc|club|vip|work|pro|tech)(?:\/[^\s<>"]*)?/gi,
];

/**
 * 台灣身分證字號
 * 格式：1碼英文 + 9碼數字
 */
export const TW_ID_PATTERN = /[a-z][12]\d{8}/gi;

/**
 * 銀行帳號模式（台灣常見格式）
 * 10-16位數字
 */
export const BANK_ACCOUNT_PATTERN = /\d{10,16}/g;

/**
 * 加密貨幣錢包地址
 */
export const CRYPTO_PATTERNS = {
  // Bitcoin
  BTC: /[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}/g,
  // Ethereum
  ETH: /0x[a-fA-F0-9]{40}/g,
  // USDT/TRC20
  TRC20: /T[a-zA-Z1-9]{33}/g,
};

/**
 * 信用卡號模式
 * 常見格式：16位數字
 */
export const CREDIT_CARD_PATTERN = /\d{16}/g;

/**
 * 社群帳號格式
 * @xxx 或 # 開頭
 */
export const SOCIAL_HANDLE_PATTERN = /@[a-z0-9._]{1,30}/gi;

/**
 * 檢測是否為有效的台灣手機號碼
 */
export function isValidTaiwanMobile(digits: string): boolean {
  // 必須是 09 開頭的 10 位數字
  return /^09\d{8}$/.test(digits);
}

/**
 * 檢測是否為有效的國際電話格式（台灣）
 */
export function isValidIntlPhone(digits: string): boolean {
  // +886 或 886 開頭，後面跟 9 開頭的 9 位數字
  return /^(\+?886)?9\d{8}$/.test(digits);
}

/**
 * 檢測是否可能是電話號碼
 * 使用啟發式規則
 */
export function isPossiblePhone(digits: string): boolean {
  // 長度檢查（7-12位）
  if (digits.length < 7 || digits.length > 12) {
    return false;
  }

  // 台灣手機
  if (isValidTaiwanMobile(digits)) {
    return true;
  }

  // 國際格式
  if (isValidIntlPhone(digits)) {
    return true;
  }

  // 市話格式
  if (/^0[2-9]\d{7,8}$/.test(digits)) {
    return true;
  }

  // 不太可能是電話的數字模式
  // 例如：重複數字（11111111）、連續數字（12345678）
  if (/^(.)\1+$/.test(digits)) {
    return false; // 全部重複
  }

  // 7位以上連續數字可能是電話
  return digits.length >= 8;
}

/**
 * 檢測是否為有效的 LINE ID
 */
export function isValidLineId(id: string): boolean {
  // 4-20字元，字母開頭
  if (!/^[a-z][a-z0-9._]{3,19}$/i.test(id)) {
    return false;
  }

  // 排除常見的非 ID 字串
  const commonWords = [
    'line', 'this', 'that', 'with', 'from', 'have', 'will',
    'your', 'what', 'when', 'where', 'which', 'there', 'their',
    'about', 'would', 'could', 'should', 'these', 'those',
    'please', 'thanks', 'hello', 'sorry', 'today', 'right',
  ];
  return !commonWords.includes(id.toLowerCase());
}

/**
 * 檢測是否為有效的台灣身分證字號
 * 使用驗證碼檢查
 */
export function isValidTaiwanId(id: string): boolean {
  if (!/^[A-Z][12]\d{8}$/i.test(id)) {
    return false;
  }

  // 身分證字號驗證邏輯
  const letterValues: Record<string, number> = {
    A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34,
    J: 18, K: 19, L: 20, M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25,
    S: 26, T: 27, U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
  };

  const upper = id.toUpperCase();
  const letterValue = letterValues[upper[0]];
  if (!letterValue) return false;

  const n1 = Math.floor(letterValue / 10);
  const n2 = letterValue % 10;

  let sum = n1 + n2 * 9;
  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  for (let i = 0; i < 8; i++) {
    sum += parseInt(upper[i + 1]) * weights[i];
  }
  sum += parseInt(upper[9]);

  return sum % 10 === 0;
}
