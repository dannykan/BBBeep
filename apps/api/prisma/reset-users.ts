import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Resetting all user phone numbers...');

  // 找到所有有手机号的用户
  const users = await prisma.user.findMany({
    where: {
      phone: {
        // 匹配有效的手机号格式 (09开头，10位数字)
        startsWith: '09',
      },
    },
  });

  console.log(`Found ${users.length} users with phone numbers`);

  // 将所有用户的手机号改成临时号码
  const timestamp = Date.now();
  for (const user of users) {
    const tempPhone = `temp_${user.phone}_${timestamp}`;
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phone: tempPhone,
        password: null, // 清除密码
        licensePlate: null, // 清除车牌，让用户可以重新绑定
        hasCompletedOnboarding: false, // 重置 onboarding 状态
      },
    });

    console.log(`✅ Updated user ${user.id}: ${user.phone} -> ${tempPhone}`);
  }

  console.log(`\n✅ Successfully reset ${users.length} users`);
  console.log(`📱 All phone numbers have been changed to temporary values`);
  console.log(`🔓 All passwords have been cleared`);
  console.log(`🚗 All license plates have been cleared`);
  console.log(`📝 All onboarding states have been reset`);
  console.log(`\n✨ You can now register as a new user with any phone number`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
