/**
 * 車牌格式統一腳本
 * 將所有車牌統一為不含分隔符的格式，並合併重複車牌
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 格式化車牌（去除所有非字母數字字符）
 */
function normalizeLicensePlate(plate: string | null): string | null {
  if (!plate) return null;
  return plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

async function main() {
  console.log('🔄 開始統一車牌格式...\n');

  // 1. 獲取所有有車牌的用戶
  const allUsers = await prisma.user.findMany({
    where: {
      licensePlate: { not: null },
    },
    include: {
      receivedMessages: true,
      sentMessages: true,
      pointHistory: true,
    },
  });

  console.log(`找到 ${allUsers.length} 個有車牌的用戶\n`);

  // 2. 按格式化後的車牌分組
  const plateGroups = new Map<string, typeof allUsers>();

  for (const user of allUsers) {
    const normalized = normalizeLicensePlate(user.licensePlate);
    if (!normalized) continue;

    if (!plateGroups.has(normalized)) {
      plateGroups.set(normalized, []);
    }
    plateGroups.get(normalized)!.push(user);
  }

  console.log(`找到 ${plateGroups.size} 個唯一車牌（格式化後）\n`);

  // 3. 處理每個車牌組
  let mergedCount = 0;
  let updatedCount = 0;

  for (const [normalizedPlate, users] of plateGroups.entries()) {
    if (users.length === 1) {
      // 只有一個用戶，只需更新車牌格式
      const user = users[0];
      if (user.licensePlate !== normalizedPlate) {
        await prisma.user.update({
          where: { id: user.id },
          data: { licensePlate: normalizedPlate },
        });
        updatedCount++;
        console.log(`✅ 更新用戶 ${user.id}: ${user.licensePlate} → ${normalizedPlate}`);
      }
    } else {
      // 多個用戶使用相同車牌，需要合併
      console.log(`\n⚠️  發現重複車牌 ${normalizedPlate}，有 ${users.length} 個用戶：`);
      
      // 找出主用戶（優先順序：已完成註冊 > 不是臨時用戶 > 有更多消息 > 有更多點數 > 創建時間最早）
      const mainUser = users.reduce((prev, current) => {
        // 優先選擇已完成註冊的用戶
        if (current.hasCompletedOnboarding && !prev.hasCompletedOnboarding) return current;
        if (!current.hasCompletedOnboarding && prev.hasCompletedOnboarding) return prev;
        
        // 優先選擇不是臨時用戶的（phone 不以 temp_ 或 unbound_ 開頭）
        const currentIsTemp = current.phone.startsWith('temp_') || current.phone.startsWith('unbound_');
        const prevIsTemp = prev.phone.startsWith('temp_') || prev.phone.startsWith('unbound_');
        if (!currentIsTemp && prevIsTemp) return current;
        if (currentIsTemp && !prevIsTemp) return prev;
        
        // 比較消息和點數總數
        const currentScore = current.receivedMessages.length + current.sentMessages.length + current.points;
        const prevScore = prev.receivedMessages.length + prev.sentMessages.length + prev.points;
        
        if (currentScore > prevScore) return current;
        if (prevScore > currentScore) return prev;
        
        // 最後比較創建時間（選擇最早的）
        return new Date(current.createdAt) < new Date(prev.createdAt) ? current : prev;
      });

      console.log(`   主用戶：${mainUser.id} (phone: ${mainUser.phone})`);

      // 合併其他用戶到主用戶
      for (const user of users) {
        if (user.id === mainUser.id) {
          // 更新主用戶的車牌格式
          if (mainUser.licensePlate !== normalizedPlate) {
            await prisma.user.update({
              where: { id: mainUser.id },
              data: { licensePlate: normalizedPlate },
            });
            console.log(`   ✅ 更新主用戶車牌：${mainUser.licensePlate} → ${normalizedPlate}`);
          }
          continue;
        }

        console.log(`   合併用戶 ${user.id} (phone: ${user.phone}) 到主用戶...`);

        // 轉移收到的消息
        if (user.receivedMessages.length > 0) {
          await prisma.message.updateMany({
            where: { receiverId: user.id },
            data: { receiverId: mainUser.id },
          });
          console.log(`      - 轉移 ${user.receivedMessages.length} 條收到的消息`);
        }

        // 轉移發送的消息
        if (user.sentMessages.length > 0) {
          await prisma.message.updateMany({
            where: { senderId: user.id },
            data: { senderId: mainUser.id },
          });
          console.log(`      - 轉移 ${user.sentMessages.length} 條發送的消息`);
        }

        // 轉移點數歷史
        if (user.pointHistory.length > 0) {
          await prisma.pointHistory.updateMany({
            where: { userId: user.id },
            data: { userId: mainUser.id },
          });
          console.log(`      - 轉移 ${user.pointHistory.length} 條點數記錄`);
        }

        // 更新主用戶的點數
        if (user.points > 0) {
          const newPoints = mainUser.points + user.points;
          await prisma.user.update({
            where: { id: mainUser.id },
            data: { points: newPoints },
          });
          console.log(`      - 合併點數：${mainUser.points} + ${user.points} = ${newPoints}`);
        }

        // 刪除重複用戶
        await prisma.user.delete({
          where: { id: user.id },
        });
        console.log(`      ✅ 已刪除重複用戶 ${user.id}`);
        mergedCount++;
      }
    }
  }

  // 4. 更新所有申請中的車牌格式
  const applications = await prisma.licensePlateApplication.findMany();

  console.log(`\n🔄 更新 ${applications.length} 個車牌申請...`);
  for (const app of applications) {
    const normalized = normalizeLicensePlate(app.licensePlate);
    if (normalized && app.licensePlate !== normalized) {
      await prisma.licensePlateApplication.update({
        where: { id: app.id },
        data: { licensePlate: normalized },
      });
      console.log(`   ✅ 更新申請 ${app.id}: ${app.licensePlate} → ${normalized}`);
    }
  }

  console.log(`\n✨ 車牌格式統一完成！`);
  console.log(`   - 更新了 ${updatedCount} 個用戶的車牌格式`);
  console.log(`   - 合併了 ${mergedCount} 個重複用戶`);
  console.log(`   - 更新了 ${applications.length} 個車牌申請`);
  console.log(`\n📝 所有車牌現在都是統一格式（不含分隔符）`);
}

main()
  .catch((e) => {
    console.error('❌ 執行失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
