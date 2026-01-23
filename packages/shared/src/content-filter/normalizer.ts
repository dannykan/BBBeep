/**
 * 文字正規化處理器
 * 核心功能：處理各種規避手法，將文字轉換為標準格式以便檢測
 *
 * 處理的規避手法：
 * 1. 空白格分隔：「0 9 1 2 3 4 5 6 7 8」→「0912345678」
 * 2. 符號分隔：「L.I.N.E」→「line」
 * 3. 全形字元：「Ｌｉｎｅ」→「line」
 * 4. 中文數字：「零玖壹二」→「0912」
 * 5. 諧音字：「加我賴」→「+我line」
 * 6. 形近字替換：「@」→「a」
 */

import {
  ALL_CHAR_SUBSTITUTIONS,
  CHINESE_NUMBERS,
  HOMOPHONE_WORDS,
  SOCIAL_PLATFORM_VARIANTS,
} from './dictionaries/char-substitutions';

/**
 * 需要移除的空白字元
 * 包含各種 Unicode 空白字元
 */
const WHITESPACE_CHARS = [
  ' ',      // 一般空格
  '\t',     // Tab
  '\n',     // 換行
  '\r',     // 回車
  '\u00A0', // Non-breaking space
  '\u2000', // En quad
  '\u2001', // Em quad
  '\u2002', // En space
  '\u2003', // Em space
  '\u2004', // Three-per-em space
  '\u2005', // Four-per-em space
  '\u2006', // Six-per-em space
  '\u2007', // Figure space
  '\u2008', // Punctuation space
  '\u2009', // Thin space
  '\u200A', // Hair space
  '\u200B', // Zero width space
  '\u200C', // Zero width non-joiner
  '\u200D', // Zero width joiner
  '\u2028', // Line separator
  '\u2029', // Paragraph separator
  '\u202F', // Narrow no-break space
  '\u205F', // Medium mathematical space
  '\u3000', // Ideographic space (全形空格)
  '\uFEFF', // BOM / Zero width no-break space
];

/**
 * 需要移除的分隔符號
 */
const SEPARATOR_CHARS = [
  '.', '-', '_', ':', '/', '\\', '|',
  '。', '、', '‧', '·', '•', '．', '－', '＿', '：', '／', '＼', '｜',
  '*', '★', '☆', '●', '○', '◆', '◇', '■', '□', '▲', '△', '▼', '▽',
  '~', '～', '^', '＾',
];

/**
 * 建立移除字元的正則表達式
 */
const whitespaceRegex = new RegExp(`[${WHITESPACE_CHARS.map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join('')}]`, 'g');
const separatorRegex = new RegExp(`[${SEPARATOR_CHARS.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')}]`, 'g');

/**
 * 移除所有空白字元
 */
export function removeWhitespace(text: string): string {
  return text.replace(whitespaceRegex, '');
}

/**
 * 移除分隔符號
 */
export function removeSeparators(text: string): string {
  return text.replace(separatorRegex, '');
}

/**
 * 字元替換（單字元層級）
 * 處理：全形→半形、形近字、中文數字等
 */
export function substituteChars(text: string): string {
  let result = '';
  for (const char of text) {
    result += ALL_CHAR_SUBSTITUTIONS[char] || char;
  }
  return result;
}

/**
 * 中文數字轉換
 * 專門處理中文數字序列
 */
export function convertChineseNumbers(text: string): string {
  let result = '';
  for (const char of text) {
    result += CHINESE_NUMBERS[char] || char;
  }
  return result;
}

/**
 * 詞語替換
 * 處理諧音詞、社群平台變體等
 */
export function substituteWords(text: string): string {
  let result = text.toLowerCase();

  // 先處理社群平台變體（較長的先處理）
  const sortedPlatforms = Object.entries(SOCIAL_PLATFORM_VARIANTS)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [variant, standard] of sortedPlatforms) {
    result = result.replace(new RegExp(variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), standard);
  }

  // 再處理諧音詞
  const sortedHomophones = Object.entries(HOMOPHONE_WORDS)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [variant, standard] of sortedHomophones) {
    result = result.replace(new RegExp(variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), standard);
  }

  return result;
}

/**
 * 完整正規化流程
 * 將輸入文字轉換為標準格式以便檢測
 *
 * @param text 原始文字
 * @param options 正規化選項
 * @returns 正規化後的文字
 *
 * @example
 * normalize("0 9 1 2 3 4 5 6 7 8") // "0912345678"
 * normalize("L.I.N.E") // "line"
 * normalize("加我賴 abc123") // "+我line abc123"
 * normalize("零玖壹二") // "0912"
 */
export function normalize(
  text: string,
  options: {
    removeSpaces?: boolean;
    removeSeps?: boolean;
    substituteChars?: boolean;
    substituteWords?: boolean;
    toLowerCase?: boolean;
  } = {}
): string {
  const {
    removeSpaces = true,
    removeSeps = true,
    substituteChars: doSubstituteChars = true,
    substituteWords: doSubstituteWords = true,
    toLowerCase = true,
  } = options;

  let result = text;

  // 1. 詞語替換（在移除空白前執行，保留詞語完整性）
  if (doSubstituteWords) {
    result = substituteWords(result);
  }

  // 2. 移除空白字元
  if (removeSpaces) {
    result = removeWhitespace(result);
  }

  // 3. 移除分隔符號
  if (removeSeps) {
    result = removeSeparators(result);
  }

  // 4. 字元替換（全形→半形、形近字等）
  if (doSubstituteChars) {
    result = substituteChars(result);
  }

  // 5. 轉小寫
  if (toLowerCase) {
    result = result.toLowerCase();
  }

  return result;
}

/**
 * 輕量正規化（僅用於快速檢測）
 * 不進行詞語替換，速度更快
 */
export function normalizeLight(text: string): string {
  return normalize(text, {
    removeSpaces: true,
    removeSeps: true,
    substituteChars: true,
    substituteWords: false,
    toLowerCase: true,
  });
}

/**
 * 僅正規化數字部分
 * 用於電話號碼檢測
 */
export function normalizeNumbers(text: string): string {
  // 先轉換中文數字
  let result = convertChineseNumbers(text);
  // 移除空白和分隔符
  result = removeWhitespace(result);
  result = removeSeparators(result);
  // 只保留數字
  return result.replace(/[^\d]/g, '');
}

/**
 * 提取文字中的所有數字序列
 * @returns 數字序列陣列
 */
export function extractNumberSequences(text: string): string[] {
  const normalized = normalizeNumbers(text);
  // 找出連續的數字序列
  const matches = normalized.match(/\d+/g);
  return matches || [];
}

/**
 * 檢查文字是否包含特定模式（正規化後）
 */
export function containsNormalized(text: string, pattern: string | RegExp): boolean {
  const normalized = normalize(text);
  if (typeof pattern === 'string') {
    return normalized.includes(pattern.toLowerCase());
  }
  return pattern.test(normalized);
}
