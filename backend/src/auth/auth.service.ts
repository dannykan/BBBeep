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
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  async verifyPhone(dto: VerifyPhoneDto) {
    // 檢查今日發送次數限制（每天最多5次）
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const countKey = `verify_count:${dto.phone}:${today}`;
    const currentCount = await this.redis.get(countKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    if (count >= 5) {
      throw new UnauthorizedException('今日驗證碼發送次數已達上限（5次），請明天再來嘗試');
    }

    // 模擬發送驗證碼（實際應該發送 SMS）
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 將驗證碼存入 Redis，5分鐘過期
    await this.redis.set(`verify:${dto.phone}`, code, 300);
    
    // 增加今日發送次數（24小時過期，確保跨日時自動重置）
    await this.redis.set(countKey, (count + 1).toString(), 86400); // 24小時 = 86400秒
    
    // 開發環境直接返回驗證碼（生產環境不應返回）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Verification code for ${dto.phone}: ${code}`);
      console.log(`[DEV] Today's send count: ${count + 1}/5`);
    }
    
    return { 
      message: '驗證碼已發送', 
      code: process.env.NODE_ENV === 'development' ? code : undefined,
      remaining: 5 - (count + 1), // 剩餘發送次數
    };
  }

  async checkPhone(phone: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { phone },
        select: { id: true, password: true },
      });

      return {
        exists: !!user,
        hasPassword: !!user?.password,
      };
    } catch (error) {
      console.error('Error checking phone:', error);
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
          points: 8, // 新手禮包
          userType: 'driver', // 預設值，會在 onboarding 時更新
        },
      });

      // 記錄新手禮包點數
      await this.prisma.pointHistory.create({
        data: {
          userId: user.id,
          type: 'bonus',
          amount: 8,
          description: '新手體驗點數',
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
          points: 10, // 註冊獎勵點數
          hasCompletedOnboarding: false,
        },
      });

      // 記錄新手禮包點數
      await this.prisma.pointHistory.create({
        data: {
          userId: user.id,
          type: 'bonus',
          amount: 10,
          description: '註冊獎勵點數',
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
}
