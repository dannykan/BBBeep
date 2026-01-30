/**
 * 試用點數遷移腳本
 * 2026-01 更新：文字訊息免費，語音 8 點
 *
 * 執行方式：
 * cd apps/api
 * npx ts-node scripts/migrate-trial-points.ts
 *
 * 或使用 Railway 的 DATABASE_URL：
 * DATABASE_URL="postgresql://..." npx ts-node scripts/migrate-trial-points.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(50));
  console.log('試用點數遷移腳本');
  console.log('='.repeat(50));
  console.log('');
  console.log('改動內容：');
  console.log('- 試用期：7 天 → 14 天');
  console.log('- 試用點數：50 點 → 80 點（= 10 次語音）');
  console.log('- 文字訊息：永遠免費');
  console.log('- 語音訊息：8 點/次');
  console.log('');

  // 取得所有已完成註冊的用戶
  const users = await prisma.user.findMany({
    where: {
      hasCompletedOnboarding: true,
    },
    select: {
      id: true,
      phone: true,
      nickname: true,
      trialPoints: true,
      trialStartDate: true,
      trialEndedProcessed: true,
    },
  });

  console.log(`找到 ${users.length} 個已註冊用戶`);
  console.log('');

  if (users.length === 0) {
    console.log('沒有用戶需要遷移');
    return;
  }

  // 顯示將被更新的用戶
  console.log('將更新以下用戶：');
  for (const user of users) {
    console.log(`- ${user.nickname || user.phone || user.id}: 試用點數 ${user.trialPoints} → 80`);
  }
  console.log('');

  // 執行遷移
  console.log('開始遷移...');

  const result = await prisma.user.updateMany({
    where: {
      hasCompletedOnboarding: true,
    },
    data: {
      trialStartDate: new Date(), // 重新開始 14 天試用
      trialEndedProcessed: false, // 重置試用結束標記
      trialPoints: 80, // 給 80 點試用
    },
  });

  console.log(`成功更新 ${result.count} 個用戶`);
  console.log('');

  // 為每個用戶記錄點數歷史
  console.log('記錄點數歷史...');

  for (const user of users) {
    await prisma.pointHistory.create({
      data: {
        userId: user.id,
        type: 'bonus',
        amount: 80,
        description: '2026-01 試用期政策更新 - 重置試用點數',
      },
    });
  }

  console.log('完成！');
  console.log('');
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('遷移失敗：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
