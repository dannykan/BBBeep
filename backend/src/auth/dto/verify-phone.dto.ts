import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPhoneDto {
  @ApiProperty({ example: '0912345678', description: '手機號碼' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{8}$/, { message: '手機號碼格式錯誤，應為 09XXXXXXXX' })
  phone: string;
}
