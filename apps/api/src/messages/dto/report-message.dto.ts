import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportMessageDto {
  @ApiProperty({ required: false, example: '內容不當', description: '檢舉原因' })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '檢舉原因最多200字元' })
  reason?: string;
}
