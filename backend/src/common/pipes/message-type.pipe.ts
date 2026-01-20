import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { toPrismaType, MessageTypeChinese } from '../utils/message-type-mapper';
import { MessageType } from '@prisma/client';

@Injectable()
export class MessageTypePipe implements PipeTransform {
  transform(value: any): MessageType {
    if (!value) {
      throw new BadRequestException('type is required');
    }

    // 如果是中文字符串，轉換為 enum
    if (typeof value === 'string') {
      const validTypes: MessageTypeChinese[] = ['車況提醒', '行車安全提醒', '讚美感謝'];
      if (validTypes.includes(value as MessageTypeChinese)) {
        return toPrismaType(value as MessageTypeChinese);
      }
      throw new BadRequestException(
        `type must be one of: 車況提醒, 行車安全提醒, 讚美感謝. Got: ${value}`
      );
    }

    // 如果已經是 enum，直接返回
    if (Object.values(MessageType).includes(value)) {
      return value as MessageType;
    }

    throw new BadRequestException(`Invalid type value: ${value}`);
  }
}
