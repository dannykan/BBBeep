import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LineLoginDto {
  @ApiProperty({ description: 'LINE OAuth 授權碼', example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '用於防止 CSRF 攻擊的 state 參數', example: 'random-state-string' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({ description: 'Redirect URI（Mobile 專用）', example: 'bbbeeep://' })
  @IsOptional()
  @IsString()
  redirectUri?: string;
}
