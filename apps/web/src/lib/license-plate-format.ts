/**
 * 台灣車牌格式化工具（前端）
 * 統一處理各種車牌格式，去除所有非字母數字字符，然後標準化格式
 */

/**
 * 格式化車牌號碼（去除所有分隔符）
 * 
 * @param plate 原始車牌號碼
 * @returns 格式化後的車牌號碼（僅包含字母和數字，大寫）
 * 
 * @example
 * formatLicensePlate('BBP-2999') => 'BBP2999'
 * formatLicensePlate('BBP2999') => 'BBP2999'
 * formatLicensePlate('ABC 1234') => 'ABC1234'
 */
export function formatLicensePlate(plate: string): string {
  if (!plate) return '';
  
  // 去除所有非字母數字字符（包括空格、連字符、點等）
  const cleaned = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  return cleaned;
}

/**
 * 格式化並驗證車牌號碼
 * 
 * @param plate 原始車牌號碼
 * @returns 格式化後的車牌號碼，如果無效則返回 null
 */
export function normalizeLicensePlate(plate: string): string | null {
  const formatted = formatLicensePlate(plate);
  
  // 台灣車牌基本驗證：至少3個字符，最多8個字符
  if (formatted.length < 3 || formatted.length > 8) {
    return null;
  }
  
  // 必須包含至少一個字母和一個數字
  if (!/[A-Z]/.test(formatted) || !/[0-9]/.test(formatted)) {
    return null;
  }
  
  return formatted;
}

/**
 * 顯示格式化車牌（添加分隔符以便閱讀）
 * 根據車牌長度和格式自動添加分隔符
 * 
 * @param plate 格式化後的車牌號碼（不含分隔符）
 * @returns 帶分隔符的車牌號碼（用於顯示）
 * 
 * @example
 * displayLicensePlate('BBP2999') => 'BBP-2999'
 * displayLicensePlate('ABC1234') => 'ABC-1234'
 * displayLicensePlate('ABC123') => 'ABC-123'
 * displayLicensePlate('1234AB') => '1234-AB'
 */
export function displayLicensePlate(plate: string | null | undefined): string {
  if (!plate) return '';
  
  const formatted = formatLicensePlate(plate);
  
  // 根據長度判斷格式
  if (formatted.length === 7) {
    // 7位：通常是 ABC-1234 或 1234-ABC
    if (/^[A-Z]{3}[0-9]{4}$/.test(formatted)) {
      // 汽車：3字母+4數字
      return `${formatted.slice(0, 3)}-${formatted.slice(3)}`;
    } else if (/^[0-9]{4}[A-Z]{3}$/.test(formatted)) {
      // 特殊格式：4數字+3字母
      return `${formatted.slice(0, 4)}-${formatted.slice(4)}`;
    }
  } else if (formatted.length === 6) {
    // 6位：通常是 ABC-123 或 123-ABC
    if (/^[A-Z]{3}[0-9]{3}$/.test(formatted)) {
      // 機車：3字母+3數字
      return `${formatted.slice(0, 3)}-${formatted.slice(3)}`;
    } else if (/^[A-Z]{2}[0-9]{4}$/.test(formatted)) {
      // 汽車：2字母+4數字
      return `${formatted.slice(0, 2)}-${formatted.slice(2)}`;
    } else if (/^[0-9]{3}[A-Z]{3}$/.test(formatted)) {
      // 特殊格式：3數字+3字母
      return `${formatted.slice(0, 3)}-${formatted.slice(3)}`;
    }
  } else if (formatted.length === 5) {
    // 5位：通常是 AB-123 或 123-AB
    if (/^[A-Z]{2}[0-9]{3}$/.test(formatted)) {
      return `${formatted.slice(0, 2)}-${formatted.slice(2)}`;
    } else if (/^[0-9]{3}[A-Z]{2}$/.test(formatted)) {
      return `${formatted.slice(0, 3)}-${formatted.slice(3)}`;
    }
  }
  
  // 如果無法匹配已知格式，返回原樣（已格式化但無分隔符）
  return formatted;
}
