/**
 * 內容安全驗證裝飾器
 * 使用 @bbbeeep/shared 的 filterContent 進行內容過濾
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { filterContent } from '@bbbeeep/shared';

/**
 * 驗證內容是否安全（不包含髒話、聯繫方式、詐騙資訊等）
 *
 * @example
 * class CreateMessageDto {
 *   @IsContentSafe({ message: '訊息內容包含不當資訊' })
 *   customText?: string;
 * }
 */
export function IsContentSafe(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isContentSafe',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // 空值或非字串跳過（讓其他驗證器處理）
          if (value === undefined || value === null || value === '') {
            return true;
          }

          if (typeof value !== 'string') {
            return true;
          }

          // 執行內容過濾
          const result = filterContent(value);
          return result.isValid;
        },

        defaultMessage(args: ValidationArguments) {
          const value = args.value;

          // 空值不應該到這裡，但以防萬一
          if (!value || typeof value !== 'string') {
            return '內容格式錯誤';
          }

          // 取得具體的違規訊息
          const result = filterContent(value);
          if (result.violations.length > 0) {
            return result.violations[0].message;
          }

          return '內容包含不當資訊';
        },
      },
    });
  };
}
