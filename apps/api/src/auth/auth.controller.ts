import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { PasswordLoginDto } from './dto/password-login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LineLoginDto } from './dto/line-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { LicensePlateLoginDto } from './dto/license-plate-login.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('check-phone/:phone')
  @ApiOperation({ summary: '檢查手機號碼是否已註冊' })
  @ApiResponse({ status: 200, description: '檢查結果' })
  @ApiResponse({ status: 500, description: '伺服器錯誤' })
  async checkPhone(@Param('phone') phone: string) {
    try {
      // 解码 URL 编码的手机号码
      const decodedPhone = decodeURIComponent(phone);
      console.log(`[checkPhone] Received phone: ${phone}, decoded: ${decodedPhone}`);
      return await this.authService.checkPhone(decodedPhone);
    } catch (error) {
      console.error('[checkPhone] Error in controller:', {
        error: error.message,
        stack: error.stack,
        phone: phone,
      });
      // 重新抛出错误，让 NestJS 的异常过滤器处理
      throw error;
    }
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
  @Post('license-plate-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '車牌 + 密碼登入' })
  @ApiResponse({ status: 200, description: '登入成功' })
  @ApiResponse({ status: 401, description: '車牌或密碼錯誤' })
  async licensePlateLogin(@Body() dto: LicensePlateLoginDto) {
    return this.authService.licensePlateLogin(dto);
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

  // LINE Login 相關端點
  @Public()
  @Get('line/url')
  @ApiOperation({ summary: '取得 LINE 登入 URL' })
  @ApiQuery({ name: 'state', required: true, description: '用於防止 CSRF 攻擊的 state 參數' })
  @ApiResponse({ status: 200, description: '返回 LINE 登入 URL' })
  getLineLoginUrl(@Query('state') state: string) {
    const url = this.authService.getLineLoginUrl(state);
    return { url };
  }

  @Public()
  @Post('line/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LINE 登入（使用授權碼）' })
  @ApiResponse({ status: 200, description: '登入成功' })
  @ApiResponse({ status: 401, description: 'LINE 登入失敗' })
  async lineLogin(@Body() dto: LineLoginDto) {
    return this.authService.lineLogin(dto);
  }

  // Mobile LINE Login - 取得授權 URL（使用後端作為 callback）
  @Public()
  @Get('line/mobile-url')
  @ApiOperation({ summary: '取得 Mobile LINE 登入 URL' })
  @ApiQuery({ name: 'state', required: true, description: '用於防止 CSRF 攻擊的 state 參數' })
  @ApiResponse({ status: 200, description: '返回 LINE 登入 URL' })
  getLineMobileLoginUrl(@Query('state') state: string) {
    const url = this.authService.getLineMobileLoginUrl(state);
    return { url };
  }

  // Mobile LINE Login - 處理 LINE callback 並 redirect 到 app
  @Public()
  @Get('line/mobile-callback')
  @ApiOperation({ summary: 'LINE Mobile Callback（處理後 redirect 到 app）' })
  async lineMobileCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const appScheme = 'bbbeeep';

    if (error) {
      // LINE 授權失敗，redirect 到 app 顯示錯誤
      return res.redirect(`${appScheme}://auth/line?error=${encodeURIComponent(error)}`);
    }

    try {
      // 使用 mobile callback URL 來交換 token
      const result = await this.authService.lineMobileLogin(code, state);
      // 成功，redirect 到 app 並帶上 token
      return res.redirect(`${appScheme}://auth/line?token=${result.access_token}`);
    } catch (err) {
      console.error('[LINE_MOBILE_CALLBACK] Error:', err.message);
      return res.redirect(`${appScheme}://auth/line?error=${encodeURIComponent('登入失敗')}`);
    }
  }

  // Apple Sign-In 端點
  @Public()
  @Post('apple/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apple Sign-In 登入' })
  @ApiResponse({ status: 200, description: '登入成功' })
  @ApiResponse({ status: 401, description: 'Apple 登入失敗' })
  async appleLogin(@Body() dto: AppleLoginDto) {
    return this.authService.appleLogin(dto);
  }

  // LINE SDK Login（Mobile 用，直接傳 accessToken）
  @Public()
  @Post('line/token-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LINE Token 登入（Mobile SDK 用）' })
  @ApiResponse({ status: 200, description: '登入成功' })
  @ApiResponse({ status: 401, description: 'LINE 登入失敗' })
  async lineTokenLogin(@Body() body: { accessToken: string }) {
    return this.authService.lineTokenLogin(body.accessToken);
  }
}
