/**
 * 錯誤處理工具
 * 統一處理 API 錯誤訊息格式
 */

/**
 * 從 API 錯誤中提取可顯示的錯誤訊息
 *
 * NestJS class-validator 返回的錯誤格式：
 * { statusCode: 400, message: ['field: error message'], error: 'Bad Request' }
 *
 * 一般 API 錯誤格式：
 * { statusCode: 400, message: 'error message' }
 *
 * @param error - Axios 錯誤物件
 * @param fallback - 預設錯誤訊息
 * @returns 可顯示的錯誤訊息字串
 */
export function getErrorMessage(error: any, fallback: string = '操作失敗'): string {
  if (!error?.response?.data?.message) {
    return fallback;
  }

  const msg = error.response.data.message;

  // class-validator 返回的錯誤是陣列格式
  if (Array.isArray(msg)) {
    return msg.join('\n');
  }

  // 一般錯誤是字串格式
  if (typeof msg === 'string') {
    return msg;
  }

  return fallback;
}
