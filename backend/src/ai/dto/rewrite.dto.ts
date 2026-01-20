import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RewriteDto {
  @ApiProperty({ example: '補充說明文字', description: '需要改寫的文字' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: '文字最多100字元' })
  text: string;
}
