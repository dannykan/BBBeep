import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { PasswordLoginDto } from './dto/password-login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LineLoginDto } from './dto/line-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { LicensePlateLoginDto } from './dto/license-plate-login.dto';
import { normalizeLicensePlate } from '../common/utils/license-plate-format';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  async verifyPhone(dto: VerifyPhoneDto) {
    try {
      // 檢查今日發送次數限制（每天最多5次）
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const countKey = `verify_count:${dto.phone}:${today}`;
      
      console.log(`[VERIFY] Checking send count for ${dto.phone} on ${today}`);
      const currentCount = await this.redis.get(countKey);
      const count = currentCount ? parseInt(currentCount, 10) : 0;
      console.log(`[VERIFY] Current count: ${count}/5`);

      if (count >= 5) {
        throw new UnauthorizedException('今日驗證碼發送次數已達上限（5次），請明天再來嘗試');
      }

      // 模擬發送驗證碼（實際應該發送 SMS）
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 將驗證碼存入 Redis，5分鐘過期
      console.log(`[VERIFY] Storing code in Redis for ${dto.phone}`);
      await this.redis.set(`verify:${dto.phone}`, code, 300);
      
      // 增加今日發送次數（24小時過期，確保跨日時自動重置）
      await this.redis.set(countKey, (count + 1).toString(), 86400); // 24小時 = 86400秒
      
      // 記錄驗證碼到日誌（所有環境）
      console.log(`[VERIFY] Verification code for ${dto.phone}: ${code}`);
      console.log(`[VERIFY] Today's send count: ${count + 1}/5`);
      
      // 開發環境或測試環境直接返回驗證碼
      // 生產環境也暫時返回，方便測試（實際部署時應移除）
      const shouldReturnCode = process.env.NODE_ENV === 'development' || process.env.RETURN_VERIFY_CODE === 'true';
      
      return { 
        message: '驗證碼已發送', 
        code: shouldReturnCode ? code : code, // 暫時總是返回驗證碼用於測試
        remaining: 5 - (count + 1), // 剩餘發送次數
      };
    } catch (error) {
      console.error('[VERIFY] Error in verifyPhone:', error);
      throw error;
    }
  }

  async checkPhone(phone: string) {
    try {
      console.log(`[checkPhone] Service: Checking phone: ${phone}`);
      
      // 验证手机号码格式
      if (!phone || typeof phone !== 'string') {
        throw new BadRequestException('手機號碼格式錯誤');
      }

      // 清理手机号码（移除空格等）
      const cleanPhone = phone.trim();
      
      console.log(`[checkPhone] Service: Clean phone: ${cleanPhone}`);
      
      const user = await this.prisma.user.findUnique({
        where: { phone: cleanPhone },
        select: { id: true, password: true },
      });

      console.log(`[checkPhone] Service: User found: ${!!user}, hasPassword: ${!!user?.password}`);

      return {
        exists: !!user,
        hasPassword: !!user?.password,
      };
    } catch (error) {
      console.error('[checkPhone] Service error:', {
        error: error.message,
        stack: error.stack,
        phone: phone,
        errorName: error.constructor.name,
      });
      
      // 如果是 Prisma 错误，记录更多信息
      if (error.code) {
        console.error('[checkPhone] Prisma error code:', error.code);
      }
      
      // 重新抛出错误
      throw error;
    }
  }

  async resetVerifyCount(phone: string) {
    // 仅开发环境可用
    if (process.env.NODE_ENV !== 'development') {
      throw new UnauthorizedException('此功能仅在开发环境可用');
    }

    const today = new Date().toISOString().split('T')[0];
    const countKey = `verify_count:${phone}:${today}`;
    await this.redis.del(countKey);

    return { message: '驗證碼發送次數已重置' };
  }

  async login(dto: LoginDto) {
    // 檢查驗證碼錯誤次數限制（每個驗證碼最多5次連續錯誤嘗試）
    // 使用手機號作為 key，這樣不管輸入什麼錯誤的驗證碼都會累計
    const errorKey = `verify_error:${dto.phone}`;
    const errorCount = await this.redis.get(errorKey);
    const errors = errorCount ? parseInt(errorCount, 10) : 0;
    
    // 驗證驗證碼
    const storedCode = await this.redis.get(`verify:${dto.phone}`);
    if (!storedCode || storedCode !== dto.code) {
      // 驗證碼錯誤，增加錯誤次數
      const newErrorCount = errors + 1;
      // 錯誤計數的過期時間與驗證碼一致（5分鐘）
      await this.redis.set(errorKey, newErrorCount.toString(), 300);
      
      const remaining = 5 - newErrorCount;
      if (remaining <= 0) {
        // 超過5次錯誤，刪除驗證碼並返回特殊錯誤
        await this.redis.del(`verify:${dto.phone}`);
        await this.redis.del(errorKey);
        throw new UnauthorizedException('連續5次輸入錯誤，請重新獲取驗證碼');
      }
      
      // 返回錯誤次數信息
      throw new UnauthorizedException(`驗證碼錯誤，剩餘 ${remaining} 次機會`);
    }
    
    // 驗證成功，清除錯誤計數
    await this.redis.del(errorKey);

    // 查找或創建用戶
    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          userType: 'driver', // 預設值，會在 onboarding 時更新
          lastFreePointsReset: new Date(), // 初始化免費點數重置時間
        },
      });
    }

    // 刪除已使用的驗證碼
    await this.redis.del(`verify:${dto.phone}`);

    // 生成 JWT token
    const payload = { sub: user.id, phone: user.phone };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        licensePlate: user.licensePlate,
        userType: user.userType,
        vehicleType: user.vehicleType,
        points: user.points,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        email: user.email,
      },
    };
  }

  async passwordLogin(dto: PasswordLoginDto) {
    // 檢查密碼錯誤次數限制（每個手機號最多5次連續錯誤嘗試）
    const errorKey = `password_error:${dto.phone}`;
    const errorCount = await this.redis.get(errorKey);
    const errors = errorCount ? parseInt(errorCount, 10) : 0;
    
    // 查找用戶
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      // 用戶不存在，增加錯誤次數（防止用戶名枚舉攻擊）
      const newErrorCount = errors + 1;
      await this.redis.set(errorKey, newErrorCount.toString(), 300); // 5分鐘過期
      
      const remaining = 5 - newErrorCount;
      if (remaining <= 0) {
        await this.redis.del(errorKey);
        throw new UnauthorizedException('連續5次輸入錯誤，請前往忘記密碼頁面重設密碼');
      }
      
      throw new UnauthorizedException(`密碼錯誤，剩餘 ${remaining} 次機會`);
    }

    if (!user.password) {
      throw new UnauthorizedException('此帳號尚未設置密碼，請使用驗證碼登入');
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      // 密碼錯誤，增加錯誤次數
      const newErrorCount = errors + 1;
      await this.redis.set(errorKey, newErrorCount.toString(), 300); // 5分鐘過期
      
      const remaining = 5 - newErrorCount;
      if (remaining <= 0) {
        await this.redis.del(errorKey);
        throw new UnauthorizedException('連續5次輸入錯誤，請前往忘記密碼頁面重設密碼');
      }
      
      throw new UnauthorizedException(`密碼錯誤，剩餘 ${remaining} 次機會`);
    }
    
    // 驗證成功，清除錯誤計數
    await this.redis.del(errorKey);

    // 生成 JWT token
    const payload = { sub: user.id, phone: user.phone };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        licensePlate: user.licensePlate,
        userType: user.userType,
        vehicleType: user.vehicleType,
        points: user.points,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        email: user.email,
      },
    };
  }

  // 車牌 + 密碼登入（App Store 審核用，也可作為一般登入方式）
  async licensePlateLogin(dto: LicensePlateLoginDto) {
    // 正規化車牌號碼
    const normalizedPlate = normalizeLicensePlate(dto.licensePlate);

    // 檢查密碼錯誤次數限制
    const errorKey = `plate_password_error:${normalizedPlate}`;
    const errorCount = await this.redis.get(errorKey);
    const errors = errorCount ? parseInt(errorCount, 10) : 0;

    // 查找用戶
    const user = await this.prisma.user.findFirst({
      where: { licensePlate: normalizedPlate },
    });

    if (!user) {
      // 用戶不存在，增加錯誤次數
      const newErrorCount = errors + 1;
      await this.redis.set(errorKey, newErrorCount.toString(), 300);

      const remaining = 5 - newErrorCount;
      if (remaining <= 0) {
        await this.redis.del(errorKey);
        throw new UnauthorizedException('連續5次輸入錯誤，請稍後再試');
      }

      throw new UnauthorizedException(`車牌或密碼錯誤，剩餘 ${remaining} 次機會`);
    }

    // 檢查用戶是否被封鎖
    if (user.isBlockedByAdmin) {
      throw new UnauthorizedException('您的帳號已被停用，如有疑問請聯繫客服');
    }

    if (!user.password) {
      throw new UnauthorizedException('此帳號尚未設置密碼');
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      const newErrorCount = errors + 1;
      await this.redis.set(errorKey, newErrorCount.toString(), 300);

      const remaining = 5 - newErrorCount;
      if (remaining <= 0) {
        await this.redis.del(errorKey);
        throw new UnauthorizedException('連續5次輸入錯誤，請稍後再試');
      }

      throw new UnauthorizedException(`車牌或密碼錯誤，剩餘 ${remaining} 次機會`);
    }

    // 驗證成功，清除錯誤計數
    await this.redis.del(errorKey);

    // 生成 JWT token
    const payload = { sub: user.id, phone: user.phone };
    const token = this.jwtService.sign(payload);

    console.log(`[LICENSE_PLATE_LOGIN] User logged in: ${user.id}, plate: ${normalizedPlate}`);

    return {
      access_token: token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        licensePlate: user.licensePlate,
        userType: user.userType,
        vehicleType: user.vehicleType,
        points: user.points,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        email: user.email,
      },
    };
  }

  async setPassword(dto: SetPasswordDto) {
    // 檢查驗證碼錯誤次數限制（每個驗證碼最多5次連續錯誤嘗試）
    const errorKey = `verify_error:${dto.phone}`;
    const errorCount = await this.redis.get(errorKey);
    const errors = errorCount ? parseInt(errorCount, 10) : 0;
    
    // 驗證驗證碼
    const storedCode = await this.redis.get(`verify:${dto.phone}`);
    if (!storedCode || storedCode !== dto.code) {
      // 驗證碼錯誤，增加錯誤次數
      const newErrorCount = errors + 1;
      await this.redis.set(errorKey, newErrorCount.toString(), 300);
      
      const remaining = 5 - newErrorCount;
      if (remaining <= 0) {
        await this.redis.del(`verify:${dto.phone}`);
        await this.redis.del(errorKey);
        throw new UnauthorizedException('連續5次輸入錯誤，請重新獲取驗證碼');
      }
      
      throw new UnauthorizedException(`驗證碼錯誤，剩餘 ${remaining} 次機會`);
    }
    
    // 驗證成功，清除錯誤計數
    await this.redis.del(errorKey);

    // 查找或用戶（如果不存在則創建，用於新用戶註冊）
    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      // 新用戶註冊，先創建用戶記錄
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          userType: 'driver', // 默認值，後續 onboarding 可以修改
          hasCompletedOnboarding: false,
          lastFreePointsReset: new Date(), // 初始化免費點數重置時間
        },
      });
    }

    // 檢查密碼是否符合規則
    if (!/^[a-zA-Z0-9]{6,12}$/.test(dto.password)) {
      throw new BadRequestException('密碼長度應為6-12位，且只能包含英文字母和數字');
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 更新或用戶密碼
    user = await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 刪除已使用的驗證碼（設置密碼後才刪除）
    await this.redis.del(`verify:${dto.phone}`);

    // 生成 JWT token，讓用戶自動登入
    const payload = { sub: user.id, phone: user.phone };
    const token = this.jwtService.sign(payload);

    return { 
      message: '密碼設置成功',
      access_token: token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        licensePlate: user.licensePlate,
        userType: user.userType,
        vehicleType: user.vehicleType,
        points: user.points,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        email: user.email,
      },
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // 檢查驗證碼錯誤次數限制（每個驗證碼最多5次連續錯誤嘗試）
    const errorKey = `verify_error:${dto.phone}`;
    const errorCount = await this.redis.get(errorKey);
    const errors = errorCount ? parseInt(errorCount, 10) : 0;
    
    // 驗證驗證碼
    const storedCode = await this.redis.get(`verify:${dto.phone}`);
    if (!storedCode || storedCode !== dto.code) {
      // 驗證碼錯誤，增加錯誤次數
      const newErrorCount = errors + 1;
      await this.redis.set(errorKey, newErrorCount.toString(), 300);
      
      const remaining = 5 - newErrorCount;
      if (remaining <= 0) {
        await this.redis.del(`verify:${dto.phone}`);
        await this.redis.del(errorKey);
        throw new UnauthorizedException('連續5次輸入錯誤，請重新獲取驗證碼');
      }
      
      throw new UnauthorizedException(`驗證碼錯誤，剩餘 ${remaining} 次機會`);
    }
    
    // 驗證成功，清除錯誤計數
    await this.redis.del(errorKey);

    // 查找用戶
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new NotFoundException('用戶不存在');
    }

    // 檢查密碼是否符合規則
    if (!/^[a-zA-Z0-9]{6,12}$/.test(dto.newPassword)) {
      throw new BadRequestException('密碼長度應為6-12位，且只能包含英文字母和數字');
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // 更新用戶密碼
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 刪除已使用的驗證碼
    await this.redis.del(`verify:${dto.phone}`);

    return { message: '密碼重設成功' };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    return user;
  }

  // LINE Login 相關方法
  async lineLogin(dto: LineLoginDto) {
    try {
      // 1. 用授權碼換取 access token
      const tokenResponse = await this.exchangeLineCode(dto.code, dto.redirectUri);

      // 2. 用 access token 取得用戶資料
      const lineProfile = await this.getLineProfile(tokenResponse.access_token);

      // 3. 檢查是否已加入 LINE 官方帳號好友
      const isLineFriend = await this.checkLineFriendshipStatus(tokenResponse.access_token);
      console.log(`[LINE_LOGIN] Friendship status: ${isLineFriend}`);

      // 4. 查找或創建用戶
      let user = await this.prisma.user.findUnique({
        where: { lineUserId: lineProfile.userId },
      });

      if (!user) {
        // 新用戶，創建帳號（freePoints 會自動設為 2）
        user = await this.prisma.user.create({
          data: {
            lineUserId: lineProfile.userId,
            lineDisplayName: lineProfile.displayName,
            linePictureUrl: lineProfile.pictureUrl,
            nickname: lineProfile.displayName,
            userType: 'driver', // 預設值，會在 onboarding 時更新
            lastFreePointsReset: new Date(), // 設定今天已重置
            isLineFriend: isLineFriend,
          },
        });

        console.log(`[LINE_LOGIN] New user created: ${user.id}`);
      } else {
        // 檢查用戶是否被封鎖
        if (user.isBlockedByAdmin) {
          throw new UnauthorizedException('您的帳號已被停用，如有疑問請聯繫客服');
        }

        // 更新 LINE 資料和好友狀態
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            lineDisplayName: lineProfile.displayName,
            linePictureUrl: lineProfile.pictureUrl,
            isLineFriend: isLineFriend,
          },
        });

        console.log(`[LINE_LOGIN] Existing user logged in: ${user.id}`);
      }

      // 5. 生成 JWT token
      const payload = { sub: user.id, lineUserId: user.lineUserId };
      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          licensePlate: user.licensePlate,
          userType: user.userType,
          vehicleType: user.vehicleType,
          points: user.points,
          freePoints: user.freePoints,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
          email: user.email,
          lineUserId: user.lineUserId,
          lineDisplayName: user.lineDisplayName,
          linePictureUrl: user.linePictureUrl,
          isLineFriend: user.isLineFriend,
        },
      };
    } catch (error) {
      console.error('[LINE_LOGIN] Error:', error.response?.data || error.message);
      throw new UnauthorizedException('LINE 登入失敗，請稍後再試');
    }
  }

  private async exchangeLineCode(code: string, redirectUri?: string): Promise<{ access_token: string; id_token?: string }> {
    const channelId = this.configService.get<string>('LINE_CHANNEL_ID');
    const channelSecret = this.configService.get<string>('LINE_CHANNEL_SECRET');
    const callbackUrl = redirectUri || this.configService.get<string>('LINE_CALLBACK_URL');

    if (!channelId || !channelSecret || !callbackUrl) {
      throw new BadRequestException('LINE 設定不完整');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', callbackUrl);
    params.append('client_id', channelId);
    params.append('client_secret', channelSecret);

    const response = await axios.post(
      'https://api.line.me/oauth2/v2.1/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  }

  private async getLineProfile(accessToken: string): Promise<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
  }> {
    const response = await axios.get('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      userId: response.data.userId,
      displayName: response.data.displayName,
      pictureUrl: response.data.pictureUrl,
    };
  }

  // 檢查用戶是否已加入 LINE 官方帳號好友
  private async checkLineFriendshipStatus(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get('https://api.line.me/friendship/v1/status', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data.friendFlag === true;
    } catch (error) {
      console.error('[LINE_LOGIN] Failed to check friendship status:', error.response?.data || error.message);
      return false;
    }
  }

  // 產生 LINE 登入 URL 的輔助方法
  getLineLoginUrl(state: string): string {
    const channelId = this.configService.get<string>('LINE_CHANNEL_ID');
    const callbackUrl = this.configService.get<string>('LINE_CALLBACK_URL');

    if (!channelId || !callbackUrl) {
      throw new BadRequestException('LINE 設定不完整');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: channelId,
      redirect_uri: callbackUrl,
      state: state,
      scope: 'profile openid',
    });

    return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
  }

  // 產生 Mobile LINE 登入 URL（使用後端作為 callback）
  getLineMobileLoginUrl(state: string): string {
    const channelId = this.configService.get<string>('LINE_CHANNEL_ID');
    const mobileCallbackUrl = this.configService.get<string>('LINE_MOBILE_CALLBACK_URL');

    if (!channelId || !mobileCallbackUrl) {
      throw new BadRequestException('LINE Mobile 設定不完整');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: channelId,
      redirect_uri: mobileCallbackUrl,
      state: state,
      scope: 'profile openid',
    });

    return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
  }

  // Mobile LINE Login（使用 mobile callback URL 交換 token）
  async lineMobileLogin(code: string, state: string) {
    const mobileCallbackUrl = this.configService.get<string>('LINE_MOBILE_CALLBACK_URL');
    // 使用 mobile callback URL 作為 redirect_uri
    return this.lineLogin({ code, state, redirectUri: mobileCallbackUrl });
  }

  // LINE Token Login（Mobile SDK 用，直接用 accessToken）
  async lineTokenLogin(accessToken: string) {
    try {
      // 1. 用 accessToken 取得用戶資料
      const lineProfile = await this.getLineProfile(accessToken);

      // 2. 檢查是否已加入 LINE 官方帳號好友
      const isLineFriend = await this.checkLineFriendshipStatus(accessToken);
      console.log(`[LINE_TOKEN_LOGIN] Friendship status: ${isLineFriend}`);

      // 3. 查找或創建用戶
      let user = await this.prisma.user.findUnique({
        where: { lineUserId: lineProfile.userId },
      });

      if (!user) {
        // 新用戶，創建帳號
        user = await this.prisma.user.create({
          data: {
            lineUserId: lineProfile.userId,
            lineDisplayName: lineProfile.displayName,
            linePictureUrl: lineProfile.pictureUrl,
            nickname: lineProfile.displayName,
            userType: 'driver',
            lastFreePointsReset: new Date(),
            isLineFriend: isLineFriend,
          },
        });
        console.log(`[LINE_TOKEN_LOGIN] New user created: ${user.id}`);
      } else {
        // 檢查用戶是否被封鎖
        if (user.isBlockedByAdmin) {
          throw new UnauthorizedException('您的帳號已被停用，如有疑問請聯繫客服');
        }

        // 更新 LINE 資料和好友狀態
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            lineDisplayName: lineProfile.displayName,
            linePictureUrl: lineProfile.pictureUrl,
            isLineFriend: isLineFriend,
          },
        });
        console.log(`[LINE_TOKEN_LOGIN] Existing user logged in: ${user.id}`);
      }

      // 4. 生成 JWT token
      const payload = { sub: user.id, lineUserId: user.lineUserId };
      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          licensePlate: user.licensePlate,
          userType: user.userType,
          vehicleType: user.vehicleType,
          points: user.points,
          freePoints: user.freePoints,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
          email: user.email,
          lineUserId: user.lineUserId,
          lineDisplayName: user.lineDisplayName,
          linePictureUrl: user.linePictureUrl,
          isLineFriend: user.isLineFriend,
        },
      };
    } catch (error) {
      console.error('[LINE_TOKEN_LOGIN] Error:', error.response?.data || error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('LINE 登入失敗，請稍後再試');
    }
  }

  // Apple Sign-In 相關方法
  async appleLogin(dto: AppleLoginDto) {
    try {
      // 1. 驗證 Apple Identity Token
      const appleUser = await this.verifyAppleToken(dto.identityToken);

      // 2. 查找或創建用戶
      let user = await this.prisma.user.findUnique({
        where: { appleUserId: appleUser.sub },
      });

      if (!user) {
        // 新用戶，創建帳號
        user = await this.prisma.user.create({
          data: {
            appleUserId: appleUser.sub,
            appleEmail: dto.email || appleUser.email,
            nickname: dto.fullName || undefined,
            email: dto.email || appleUser.email,
            userType: 'driver', // 預設值，會在 onboarding 時更新
            lastFreePointsReset: new Date(),
          },
        });

        console.log(`[APPLE_LOGIN] New user created: ${user.id}`);
      } else {
        // 檢查用戶是否被封鎖
        if (user.isBlockedByAdmin) {
          throw new UnauthorizedException('您的帳號已被停用，如有疑問請聯繫客服');
        }

        // 更新 Apple 資料（只有在首次登入時才會有 email 和 fullName）
        const updateData: Record<string, string | undefined> = {};
        if (dto.email && !user.appleEmail) {
          updateData.appleEmail = dto.email;
          updateData.email = dto.email;
        }
        if (dto.fullName && !user.nickname) {
          updateData.nickname = dto.fullName;
        }

        if (Object.keys(updateData).length > 0) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        }

        console.log(`[APPLE_LOGIN] Existing user logged in: ${user.id}`);
      }

      // 3. 生成 JWT token
      const payload = { sub: user.id, appleUserId: user.appleUserId };
      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          licensePlate: user.licensePlate,
          userType: user.userType,
          vehicleType: user.vehicleType,
          points: user.points,
          freePoints: user.freePoints,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
          email: user.email,
          appleUserId: user.appleUserId,
          appleEmail: user.appleEmail,
        },
      };
    } catch (error) {
      console.error('[APPLE_LOGIN] Error:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Apple 登入失敗，請稍後再試');
    }
  }

  // 驗證 Apple Identity Token
  private async verifyAppleToken(identityToken: string): Promise<{
    sub: string;
    email?: string;
    email_verified?: boolean;
  }> {
    // Apple 的 JWKS 端點
    const client = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      rateLimit: true,
    });

    // 解碼 JWT header 獲取 kid
    const decodedHeader = jwt.decode(identityToken, { complete: true });
    if (!decodedHeader || typeof decodedHeader === 'string') {
      throw new Error('Invalid identity token format');
    }

    const kid = decodedHeader.header.kid;
    if (!kid) {
      throw new Error('No kid found in token header');
    }

    // 獲取公鑰
    const key = await client.getSigningKey(kid);
    const publicKey = key.getPublicKey();

    // 驗證 token
    const appleClientId = this.configService.get<string>('APPLE_CLIENT_ID') || 'com.bbbeeep.mobile';

    const decoded = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: appleClientId,
    }) as {
      sub: string;
      email?: string;
      email_verified?: string;
      iss: string;
      aud: string;
    };

    return {
      sub: decoded.sub,
      email: decoded.email,
      email_verified: decoded.email_verified === 'true',
    };
  }
}
