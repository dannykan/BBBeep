import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function main() {
  console.log('🔄 Clearing Redis cache...');

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  });

  try {
    // 获取所有验证码相关的 keys
    const verifyKeys = await redis.keys('verify:*');
    const verifyErrorKeys = await redis.keys('verify_error:*');
    const verifyCountKeys = await redis.keys('verify_count:*');
    const passwordErrorKeys = await redis.keys('password_error:*');

    const allKeys = [
      ...verifyKeys,
      ...verifyErrorKeys,
      ...verifyCountKeys,
      ...passwordErrorKeys,
    ];

    console.log(`Found ${allKeys.length} Redis keys to delete`);

    if (allKeys.length > 0) {
      // 删除所有相关 keys
      await redis.del(...allKeys);
      console.log(`✅ Deleted ${allKeys.length} Redis keys`);
    } else {
      console.log('✅ No Redis keys to delete');
    }

    console.log('\n✨ Redis cache has been cleared');
    console.log('📱 All verification codes have been cleared');
    console.log('🔓 All error counts have been cleared');
  } catch (error) {
    console.error('❌ Error clearing Redis:', error);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

main();
