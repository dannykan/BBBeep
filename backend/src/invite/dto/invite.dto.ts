import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class ValidateInviteCodeDto {
  @ApiProperty({ description: '邀請碼', example: 'ABCD12' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]+$/, { message: '邀請碼必須為6位大寫英數字' })
  code: string;
}

export class ApplyInviteCodeDto {
  @ApiProperty({ description: '邀請碼', example: 'ABCD12' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]+$/, { message: '邀請碼必須為6位大寫英數字' })
  code: string;
}

export class InviteCodeResponseDto {
  @ApiProperty({ description: '用戶的邀請碼' })
  inviteCode: string;

  @ApiProperty({ description: '成功邀請人數' })
  inviteCount: number;

  @ApiProperty({ description: '獲得的總獎勵點數' })
  totalRewards: number;

  @ApiProperty({ description: '邀請人獎勵（每次成功邀請）' })
  inviterReward: number;

  @ApiProperty({ description: '被邀請人獎勵' })
  inviteeReward: number;
}

export class ValidateCodeResponseDto {
  @ApiProperty({ description: '邀請碼是否有效' })
  valid: boolean;

  @ApiPropertyOptional({ description: '邀請人暱稱' })
  inviterNickname?: string;

  @ApiPropertyOptional({ description: '被邀請人可獲得的獎勵' })
  inviteeReward?: number;

  @ApiPropertyOptional({ description: '錯誤訊息' })
  message?: string;
}

export class InviteHistoryItemDto {
  @ApiProperty({ description: '邀請記錄 ID' })
  id: string;

  @ApiProperty({ description: '被邀請人暱稱' })
  inviteeNickname: string;

  @ApiProperty({ description: '邀請狀態' })
  status: 'pending' | 'completed' | 'expired';

  @ApiProperty({ description: '獲得的獎勵' })
  reward: number;

  @ApiProperty({ description: '邀請時間' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '獎勵發放時間' })
  rewardedAt?: Date;
}
