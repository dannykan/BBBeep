import { PrismaClient, MessageType, UserType, VehicleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ABC1232 mockup data...');

  // 查找或創建 ABC1232 用戶
  let targetUser = await prisma.user.findFirst({
    where: {
      licensePlate: 'ABC1232',
    },
  });

  if (!targetUser) {
    targetUser = await prisma.user.create({
      data: {
        phone: '0911111232',
        licensePlate: 'ABC1232',
        nickname: 'ABC測試用戶',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        points: 100,
        hasCompletedOnboarding: true,
      },
    });
    console.log('✅ Created user for ABC1232');
  } else {
    console.log(`✅ Found existing user for ABC1232 (id: ${targetUser.id})`);
  }

  // 創建其他用戶（用於發送/接收消息）
  const otherUsers = await Promise.all([
    prisma.user.upsert({
      where: { phone: '0922001001' },
      update: {},
      create: {
        phone: '0922001001',
        nickname: '王小明',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        licensePlate: 'XYZ7890',
        points: 30,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0922001002' },
      update: {},
      create: {
        phone: '0922001002',
        nickname: '李小華',
        userType: UserType.driver,
        vehicleType: VehicleType.scooter,
        licensePlate: 'DEF4567',
        points: 25,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0922001003' },
      update: {},
      create: {
        phone: '0922001003',
        nickname: null, // 匿名
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        licensePlate: 'GHI1234',
        points: 20,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0922001004' },
      update: {},
      create: {
        phone: '0922001004',
        nickname: '陳大文',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        licensePlate: 'JKL5678',
        points: 35,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0922001005' },
      update: {},
      create: {
        phone: '0922001005',
        nickname: '林美麗',
        userType: UserType.driver,
        vehicleType: VehicleType.scooter,
        licensePlate: 'MNO9012',
        points: 40,
        hasCompletedOnboarding: true,
      },
    }),
  ]);

  console.log('✅ Created/found other users');

  const now = new Date();

  // ========== 收件箱消息（ABC1232 接收的消息）==========
  const inboxMessages = [
    // 未讀 - 車況提醒（5分鐘前）有地點和時間
    {
      senderId: otherUsers[0].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車燈似乎尚未開啟，行駛時請多注意安全。',
      customText: null,
      location: '台北市信義區松高路12號',
      occurredAt: new Date(now.getTime() - 10 * 60 * 1000),
      read: false,
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
    // 未讀 - 行車安全提醒（15分鐘前）有地點
    {
      senderId: otherUsers[1].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛變換車道時似乎未打方向燈，提醒您注意行車安全。',
      customText: '在路口轉彎時請記得先打方向燈',
      location: '台北市中山區南京東路三段',
      occurredAt: new Date(now.getTime() - 20 * 60 * 1000),
      read: false,
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
    // 未讀 - 讚美感謝（30分鐘前）
    {
      senderId: otherUsers[2].id, // 匿名
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您禮讓行人，讓道路環境更加友善。',
      customText: null,
      location: null,
      occurredAt: new Date(now.getTime() - 35 * 60 * 1000),
      read: false,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
    // 未讀 - 車況提醒（1小時前）有地點
    {
      senderId: otherUsers[3].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車門可能未完全關閉，為了安全請多留意。',
      customText: '右後車門沒關好',
      location: '新北市板橋區中山路一段',
      occurredAt: null,
      read: false,
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
    // 未讀 - 行車安全提醒（2小時前）
    {
      senderId: otherUsers[4].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛與前車距離較近，提醒您保持安全車距。',
      customText: null,
      location: '國道一號南向 32K',
      occurredAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      read: false,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    // 已讀 - 讚美感謝（1天前）有回覆
    {
      senderId: otherUsers[0].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您剛剛的禮讓，讓行車更加順暢。',
      customText: '在路口等紅燈時讓我先過，非常感謝',
      location: '台北市大安區敦化南路',
      occurredAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000),
      read: true,
      replyText: '收到，謝謝！',
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    // 已讀 - 車況提醒（2天前）
    {
      senderId: otherUsers[1].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車輛輪胎狀況似乎有些異常，建議留意安全。',
      customText: '左後輪看起來有點扁',
      location: null,
      occurredAt: null,
      read: true,
      replyText: '謝謝提醒，我會去檢查',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    // 已讀 - 行車安全提醒（3天前）
    {
      senderId: otherUsers[2].id, // 匿名
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛行駛速度似乎較快，提醒您注意行車安全。',
      customText: null,
      location: '台北市內湖區成功路',
      occurredAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 - 10 * 60 * 1000),
      read: true,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    // 已讀 - 讚美感謝（5天前）
    {
      senderId: otherUsers[3].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '剛剛的行車方式很穩定，謝謝您保持良好習慣。',
      customText: null,
      location: null,
      occurredAt: null,
      read: true,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  ];

  // ========== 發送紀錄（ABC1232 發送的消息）==========
  const sentMessages = [
    // 發送給 XYZ7890（5分鐘前）已讀，有回覆，有地點時間
    {
      senderId: targetUser.id,
      receiverId: otherUsers[0].id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車燈似乎尚未開啟，行駛時請多注意安全。',
      customText: '大燈沒開喔',
      location: '台北市松山區民生東路',
      occurredAt: new Date(now.getTime() - 10 * 60 * 1000),
      read: true,
      replyText: '謝謝提醒，已經開了！',
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
    // 發送給 DEF4567（20分鐘前）已讀，無回覆
    {
      senderId: targetUser.id,
      receiverId: otherUsers[1].id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛變換車道時似乎未打方向燈，提醒您注意行車安全。',
      customText: null,
      location: '台北市中正區忠孝東路',
      occurredAt: new Date(now.getTime() - 25 * 60 * 1000),
      read: true,
      replyText: null,
      createdAt: new Date(now.getTime() - 20 * 60 * 1000),
    },
    // 發送給 GHI1234（1小時前）未讀
    {
      senderId: targetUser.id,
      receiverId: otherUsers[2].id,
      type: MessageType.PRAISE,
      template: '謝謝您禮讓行人，讓道路環境更加友善。',
      customText: '在學校門口讓小朋友過馬路，很有愛心',
      location: '台北市大安區和平東路',
      occurredAt: new Date(now.getTime() - 1.1 * 60 * 60 * 1000),
      read: false,
      replyText: null,
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
    // 發送給 JKL5678（3小時前）已讀，有回覆
    {
      senderId: targetUser.id,
      receiverId: otherUsers[3].id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車門可能未完全關閉，為了安全請多留意。',
      customText: null,
      location: null,
      occurredAt: null,
      read: true,
      replyText: '感謝提醒，我檢查一下',
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
    // 發送給 MNO9012（1天前）已讀，無回覆
    {
      senderId: targetUser.id,
      receiverId: otherUsers[4].id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛與前車距離較近，提醒您保持安全車距。',
      customText: '在高速公路上請保持安全距離',
      location: '國道三號北向 45K',
      occurredAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000),
      read: true,
      replyText: null,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    // 發送給 XYZ7890（2天前）已讀，有回覆
    {
      senderId: targetUser.id,
      receiverId: otherUsers[0].id,
      type: MessageType.PRAISE,
      template: '謝謝您剛剛的禮讓，讓行車更加順暢。',
      customText: null,
      location: '台北市信義區基隆路',
      occurredAt: null,
      read: true,
      replyText: '不客氣，大家互相禮讓！',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    // 發送給 DEF4567（4天前）已讀，無回覆
    {
      senderId: targetUser.id,
      receiverId: otherUsers[1].id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車輛輪胎狀況似乎有些異常，建議留意安全。',
      customText: '右前輪看起來有點磨損',
      location: null,
      occurredAt: null,
      read: true,
      replyText: null,
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    // 發送給 GHI1234（6天前）未讀
    {
      senderId: targetUser.id,
      receiverId: otherUsers[2].id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛行駛速度似乎較快，提醒您注意行車安全。',
      customText: null,
      location: '台北市南港區研究院路',
      occurredAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000),
      read: false,
      replyText: null,
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
  ];

  // 刪除 ABC1232 的現有消息
  await prisma.message.deleteMany({
    where: {
      OR: [
        { receiverId: targetUser.id },
        { senderId: targetUser.id },
      ],
    },
  });

  // 創建收件箱消息
  for (const msg of inboxMessages) {
    await prisma.message.create({
      data: msg,
    });
  }

  // 創建發送紀錄
  for (const msg of sentMessages) {
    await prisma.message.create({
      data: msg,
    });
  }

  console.log(`\n✅ Created messages for ABC1232`);
  console.log(`   - 收件箱: ${inboxMessages.length} 則`);
  console.log(`     - 未讀: ${inboxMessages.filter(m => !m.read).length} 則`);
  console.log(`     - 已讀: ${inboxMessages.filter(m => m.read).length} 則`);
  console.log(`     - 有地點: ${inboxMessages.filter(m => m.location).length} 則`);
  console.log(`     - 有事發時間: ${inboxMessages.filter(m => m.occurredAt).length} 則`);
  console.log(`   - 發送紀錄: ${sentMessages.length} 則`);
  console.log(`     - 已讀: ${sentMessages.filter(m => m.read).length} 則`);
  console.log(`     - 有回覆: ${sentMessages.filter(m => m.replyText).length} 則`);
  console.log(`     - 有地點: ${sentMessages.filter(m => m.location).length} 則`);
  console.log(`     - 有事發時間: ${sentMessages.filter(m => m.occurredAt).length} 則`);

  console.log('\n✨ ABC1232 mockup data seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
