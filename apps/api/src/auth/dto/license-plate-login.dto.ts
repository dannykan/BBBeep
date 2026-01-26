import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LicensePlateLoginDto {
  @ApiProperty({ example: 'ABC-1234', description: '車牌號碼' })
  @IsString()
  @IsNotEmpty({ message: '請輸入車牌號碼' })
  licensePlate: string;

  @ApiProperty({ example: '12345678', description: '密碼' })
  @IsString()
  @IsNotEmpty({ message: '請輸入密碼' })
  @MinLength(6, { message: '密碼至少需要 6 個字元' })
  password: string;
}
