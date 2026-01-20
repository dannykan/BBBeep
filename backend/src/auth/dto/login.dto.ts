import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '0912345678', description: '手機號碼' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{8}$/, { message: '手機號碼格式錯誤，應為 09XXXXXXXX' })
  phone: string;

  @ApiProperty({ example: '123456', description: '驗證碼（6位數）' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: '驗證碼應為6位數' })
  code: string;
}
