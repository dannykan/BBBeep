import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { PasswordLoginDto } from './dto/password-login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('check-phone/:phone')
  @ApiOperation({ summary: '檢查手機號碼是否已註冊' })
  @ApiResponse({ status: 200, description: '檢查結果' })
  async checkPhone(@Param('phone') phone: string) {
    return this.authService.checkPhone(phone);
  }

  @Public()
  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '發送手機驗證碼' })
  @ApiResponse({ status: 200, description: '驗證碼已發送' })
  async verifyPhone(@Body() dto: VerifyPhoneDto) {
    return this.authService.verifyPhone(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登入（驗證碼方式，用於首次註冊）' })
  @ApiResponse({ status: 200, description: '登入成功' })
  @ApiResponse({ status: 401, description: '驗證碼錯誤' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('password-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '密碼登入' })
  @ApiResponse({ status: 200, description: '登入成功' })
  @ApiResponse({ status: 401, description: '手機號碼或密碼錯誤' })
  async passwordLogin(@Body() dto: PasswordLoginDto) {
    return this.authService.passwordLogin(dto);
  }

  @Public()
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '設置密碼（註冊時使用）' })
  @ApiResponse({ status: 200, description: '密碼設置成功' })
  @ApiResponse({ status: 401, description: '驗證碼錯誤' })
  async setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重設密碼（忘記密碼時使用）' })
  @ApiResponse({ status: 200, description: '密碼重設成功' })
  @ApiResponse({ status: 401, description: '驗證碼錯誤' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('reset-verify-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置驗證碼發送次數（僅開發環境）' })
  @ApiResponse({ status: 200, description: '重置成功' })
  async resetVerifyCount(@Body() body: { phone: string }) {
    return this.authService.resetVerifyCount(body.phone);
  }
}
