import { PrismaClient, MessageType, UserType, VehicleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding BBP2999 mockup data...');

  // 查找或創建 BBP2999 用戶（使用格式化後的車牌，不含分隔符）
  let targetUser = await prisma.user.findFirst({
    where: {
      licensePlate: 'BBP2999',
    },
  });

  if (!targetUser) {
    // 如果不存在，創建新用戶
    targetUser = await prisma.user.create({
      data: {
        phone: '0912345678',
        licensePlate: 'BBP2999', // 使用統一格式（不含分隔符）
        nickname: '測試用戶',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        points: 50,
        hasCompletedOnboarding: true,
      },
    });
    console.log('✅ Created user for BBP2999');
  } else {
    // 確保車牌格式正確
    if (targetUser.licensePlate !== 'BBP2999') {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { licensePlate: 'BBP2999' },
      });
      console.log(`✅ Updated user license plate: ${targetUser.licensePlate} → BBP2999`);
    } else {
      console.log(`✅ Found existing user for BBP2999 (phone: ${targetUser.phone})`);
    }
  }

  // 創建多個發送者用戶（用於發送各種消息）
  const senders = await Promise.all([
    prisma.user.upsert({
      where: { phone: '0900000001' },
      update: {},
      create: {
        phone: '0900000001',
        nickname: '張三',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        licensePlate: 'ABC1234',
        points: 10,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0900000002' },
      update: {},
      create: {
        phone: '0900000002',
        nickname: '李四',
        userType: UserType.driver,
        vehicleType: VehicleType.scooter,
        licensePlate: 'XYZ5678',
        points: 15,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0900000003' },
      update: {},
      create: {
        phone: '0900000003',
        nickname: '王五',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        licensePlate: 'DEF9012',
        points: 8,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0900000004' },
      update: {},
      create: {
        phone: '0900000004',
        nickname: null, // 匿名用戶
        userType: UserType.driver,
        vehicleType: VehicleType.scooter,
        licensePlate: 'GHI3456',
        points: 12,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0900000005' },
      update: {},
      create: {
        phone: '0900000005',
        nickname: '陳六',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        licensePlate: 'JKL7890',
        points: 20,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0900000006' },
      update: {},
      create: {
        phone: '0900000006',
        nickname: '林七',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        licensePlate: 'MNO1234',
        points: 25,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0900000007' },
      update: {},
      create: {
        phone: '0900000007',
        nickname: '黃八',
        userType: UserType.driver,
        vehicleType: VehicleType.scooter,
        licensePlate: 'PQR5678',
        points: 18,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0900000008' },
      update: {},
      create: {
        phone: '0900000008',
        nickname: null, // 匿名用戶
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        licensePlate: 'STU9012',
        points: 22,
        hasCompletedOnboarding: true,
      },
    }),
  ]);

  console.log('✅ Created sender users');

  // 刪除現有的消息（避免重複）
  await prisma.message.deleteMany({
    where: {
      receiverId: targetUser.id,
    },
  });

  // 創建各種狀態和類型的 mock 消息
  const now = new Date();

  // ========== 未讀消息（最新）==========
  const unreadMessages = [
    // 車況提醒 - 車燈未開（5分鐘前）
    {
      senderId: senders[0].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車燈似乎尚未開啟，行駛時請多注意安全。',
      customText: null,
      read: false,
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
    // 行車安全提醒 - 未打方向燈，帶補充（10分鐘前）
    {
      senderId: senders[1].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛變換車道時似乎未打方向燈，提醒您注意行車安全。',
      customText: '在高速公路上變換車道時，請務必先打方向燈，並確認後方來車安全距離。',
      read: false,
      createdAt: new Date(now.getTime() - 10 * 60 * 1000),
    },
    // 讚美感謝 - 禮讓行人（15分鐘前）
    {
      senderId: senders[2].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您禮讓行人，讓道路環境更加友善。',
      customText: null,
      read: false,
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
    // 車況提醒 - 車門未關，帶補充（20分鐘前）
    {
      senderId: senders[3].id, // 匿名
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車門可能未完全關閉，為了安全請多留意。',
      customText: '在停車場時發現您的右後車門似乎沒有完全關閉，為了行車安全，建議您檢查一下。',
      read: false,
      createdAt: new Date(now.getTime() - 20 * 60 * 1000),
    },
    // 行車安全提醒 - 跟車太近（30分鐘前）
    {
      senderId: senders[4].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛與前車距離較近，提醒您保持安全車距。',
      customText: null,
      read: false,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
    // 讚美感謝 - 行車穩定，帶補充（45分鐘前）
    {
      senderId: senders[5].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '剛剛的行車方式很穩定，謝謝您保持良好習慣。',
      customText: '特別是在路口停等時，您的耐心等待讓整個交通流暢許多。',
      read: false,
      createdAt: new Date(now.getTime() - 45 * 60 * 1000),
    },
    // 車況提醒 - 行李箱未關（1小時前）
    {
      senderId: senders[6].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您行李箱似乎未完全關好，行駛時請多注意。',
      customText: null,
      read: false,
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
    // 行車安全提醒 - 車速過快（1.5小時前）
    {
      senderId: senders[7].id, // 匿名
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛行駛速度似乎較快，提醒您注意行車安全。',
      customText: '在市區道路上行駛，建議您放慢速度，確保安全。',
      read: false,
      createdAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
    },
    // 讚美感謝 - 謝謝讓路（2小時前）
    {
      senderId: senders[0].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您剛剛的禮讓，讓行車更加順暢。',
      customText: null,
      read: false,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    // 車況提醒 - 輪胎異常（2.5小時前）
    {
      senderId: senders[1].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車輛輪胎狀況似乎有些異常，建議留意安全。',
      customText: '左後輪看起來比其他輪胎略扁，建議您到保養廠檢查一下輪胎氣壓和狀況。',
      read: false,
      createdAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
    },
    // 行車安全提醒 - 變換車道（3小時前）
    {
      senderId: senders[2].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛變換車道時距離較近，提醒您多留意行車安全。',
      customText: null,
      read: false,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
    // 讚美感謝 - 保持距離（4小時前）
    {
      senderId: senders[3].id, // 匿名
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您保持良好的車距，讓行車更安全。',
      customText: '在高速公路上保持適當車距，展現了良好的駕駛習慣，非常感謝。',
      read: false,
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
  ];

  // ========== 已讀消息（較早）==========
  const readMessages = [
    // 車況提醒 - 車窗未關（1天前）
    {
      senderId: senders[4].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車窗可能尚未關閉，行駛時請多注意。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    // 行車安全提醒 - 路口/行人（1天前）
    {
      senderId: senders[5].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '經過路口時情況較複雜，提醒您多留意行人安全。',
      customText: '在學校附近的路口，請特別注意行人安全，減速慢行。',
      read: true,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    },
    // 讚美感謝 - 其他讚美（2天前）
    {
      senderId: senders[6].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您的駕駛方式，讓人感到安心。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    // 車況提醒 - 其他車況（2天前）
    {
      senderId: senders[7].id, // 匿名
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車輛狀況可能需要留意，請多注意行車安全。',
      customText: '引擎蓋似乎有異音，建議您盡快到保養廠檢查。',
      read: true,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
    },
    // 行車安全提醒 - 其他安全（3天前）
    {
      senderId: senders[0].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛的行車狀況可能較有風險，提醒您多注意安全。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    // 讚美感謝 - 禮讓行人，帶補充（3天前）
    {
      senderId: senders[1].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您禮讓行人，讓道路環境更加友善。',
      customText: '您的細心讓學童過馬路更加安全，非常感謝！',
      read: true,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    },
    // 車況提醒 - 輪胎異常，帶補充（4天前）
    {
      senderId: senders[2].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車輛輪胎狀況似乎有些異常，建議留意安全。',
      customText: '右前輪看起來磨損較嚴重，建議您盡快更換輪胎，確保行車安全。',
      read: true,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    // 行車安全提醒 - 未打方向燈（5天前）
    {
      senderId: senders[3].id, // 匿名
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛變換車道時似乎未打方向燈，提醒您注意行車安全。',
      customText: '變換車道前打方向燈可以讓其他駕駛預先知道您的意圖，減少意外發生。',
      read: true,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    // 讚美感謝 - 謝謝讓路，帶補充（5天前）
    {
      senderId: senders[4].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您剛剛的禮讓，讓行車更加順暢。',
      customText: '在路口讓車的舉動讓交通更加順暢，非常感謝您的友善。',
      read: true,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
    },
    // 車況提醒 - 車燈未開（6天前）
    {
      senderId: senders[5].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車燈似乎尚未開啟，行駛時請多注意安全。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    // 行車安全提醒 - 車速過快，帶補充（7天前）
    {
      senderId: senders[6].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛行駛速度似乎較快，提醒您注意行車安全。',
      customText: '在彎道處建議減速慢行，確保行車安全。',
      read: true,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    // 讚美感謝 - 行車穩定（8天前）
    {
      senderId: senders[7].id, // 匿名
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '剛剛的行車方式很穩定，謝謝您保持良好習慣。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    },
    // 車況提醒 - 車門未關（9天前）
    {
      senderId: senders[0].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車門可能未完全關閉，為了安全請多留意。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    },
    // 行車安全提醒 - 跟車太近（10天前）
    {
      senderId: senders[1].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛與前車距離較近，提醒您保持安全車距。',
      customText: '在高速公路上，建議保持至少兩個車身的距離，以應對突發狀況。',
      read: true,
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
    // 讚美感謝 - 保持距離，帶補充（11天前）
    {
      senderId: senders[2].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您保持良好的車距，讓行車更安全。',
      customText: '您的謹慎駕駛讓後方車輛也感到安全，非常感謝。',
      read: true,
      createdAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
    },
    // 車況提醒 - 行李箱未關（12天前）
    {
      senderId: senders[3].id, // 匿名
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您行李箱似乎未完全關好，行駛時請多注意。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
    },
    // 行車安全提醒 - 變換車道（13天前）
    {
      senderId: senders[4].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛變換車道時距離較近，提醒您多留意行車安全。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
    },
    // 讚美感謝 - 其他讚美，帶補充（14天前）
    {
      senderId: senders[5].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您的駕駛方式，讓人感到安心。',
      customText: '您穩定的駕駛習慣讓道路更加安全，感謝您的用心。',
      read: true,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
  ];

  const allMessages = [...unreadMessages, ...readMessages];

  // 創建消息（包含一些帶有回覆的消息）
  const messagesToCreate: any[] = [];
  
  for (let i = 0; i < allMessages.length; i++) {
    const msg = allMessages[i];
    // 為部分已讀消息添加回覆（約 30% 的已讀消息有回覆）
    if (msg.read && i % 3 === 0) {
      messagesToCreate.push({
        ...msg,
        replyText: [
          '收到，謝謝提醒！',
          '謝謝您的提醒，我會注意的。',
          '感謝您的善意提醒！',
          '知道了，感謝。',
          '謝謝，我會改進的。',
        ][Math.floor(Math.random() * 5)],
      });
    } else {
      messagesToCreate.push(msg);
    }
  }

  await prisma.message.createMany({
    data: messagesToCreate,
  });

  console.log(`\n✅ Created ${messagesToCreate.length} mock messages for BBP2999`);
  console.log(`   - 未讀消息: ${unreadMessages.length} 則`);
  console.log(`   - 已讀消息: ${readMessages.length} 則`);
  console.log(`   - 車況提醒: ${messagesToCreate.filter(m => m.type === MessageType.VEHICLE_REMINDER).length} 則`);
  console.log(`   - 行車安全提醒: ${messagesToCreate.filter(m => m.type === MessageType.SAFETY_REMINDER).length} 則`);
  console.log(`   - 讚美感謝: ${messagesToCreate.filter(m => m.type === MessageType.PRAISE).length} 則`);
  console.log(`   - 帶補充文字: ${messagesToCreate.filter(m => m.customText).length} 則`);
  console.log(`   - 帶回覆: ${messagesToCreate.filter(m => m.replyText).length} 則`);
  console.log(`   - 匿名發送者: ${messagesToCreate.filter(m => senders[3].id === m.senderId || senders[7].id === m.senderId).length} 則`);
  console.log(`\n📋 消息分佈：`);
  console.log(`   - 未讀消息：${unreadMessages.length} 則（最新到 4 小時前）`);
  console.log(`   - 已讀消息：${readMessages.length} 則（1 天前到 14 天前）`);
  console.log(`   - 匿名發送者消息：${messagesToCreate.filter(m => senders[3].id === m.senderId || senders[7].id === m.senderId).length} 則`);

  console.log('\n✨ BBP2999 mockup data seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
