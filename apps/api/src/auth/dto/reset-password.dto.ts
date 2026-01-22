import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
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

  @ApiProperty({ example: 'MyPassword123', description: '新密碼（6-12位英數）' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 12, { message: '密碼長度應為6-12位' })
  @Matches(/^[a-zA-Z0-9]+$/, { message: '密碼只能包含英文字母和數字，不可使用符號' })
  newPassword: string;
}
