import { PrismaClient, MessageType, UserType, VehicleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 查找或創建 BBP-2999 用戶
  let targetUser = await prisma.user.findFirst({
    where: {
      licensePlate: 'BBP-2999',
    },
  });

  if (!targetUser) {
    // 如果不存在，創建新用戶（使用測試手機號）
    targetUser = await prisma.user.create({
      data: {
        phone: '0912345678',
        licensePlate: 'BBP-2999',
        nickname: '測試用戶',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        points: 20,
        hasCompletedOnboarding: true,
      },
    });
    console.log('✅ Created user for BBP-2999');
  } else {
    // 如果已存在，使用現有用戶（保留原有的 phone 和其他信息）
    console.log(`✅ Found existing user for BBP-2999 (phone: ${targetUser.phone})`);
    // 確保用戶已完成 onboarding
    if (!targetUser.hasCompletedOnboarding) {
      targetUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: { hasCompletedOnboarding: true },
      });
    }
  }

  // 創建一些發送者用戶（用於發送消息給 BBP-2999）
  const senders = await Promise.all([
    prisma.user.upsert({
      where: { phone: '0900000001' },
      update: {},
      create: {
        phone: '0900000001',
        nickname: '張三',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
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
        points: 8,
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

  // 創建各種狀態的 mock 消息
  const now = new Date();
  const messages = [
    // 未讀消息
    {
      senderId: senders[0].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車燈似乎尚未開啟，行駛時請多注意安全。',
      customText: null,
      read: false,
      createdAt: new Date(now.getTime() - 10 * 60 * 1000), // 10分鐘前
    },
    {
      senderId: senders[1].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛變換車道時似乎未打方向燈，提醒您注意行車安全。',
      customText: '在高速公路上特別重要',
      read: false,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2小時前
    },
    {
      senderId: senders[2].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '謝謝您剛剛的禮讓，讓行車更加順暢。',
      customText: null,
      read: false,
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5小時前
    },
    // 已讀消息
    {
      senderId: senders[0].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車門可能未完全關閉，為了安全請多留意。',
      customText: '在停車場時發現的',
      read: true,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1天前
    },
    {
      senderId: senders[1].id,
      receiverId: targetUser.id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛與前車距離較近，提醒您保持安全車距。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2天前
    },
    {
      senderId: senders[2].id,
      receiverId: targetUser.id,
      type: MessageType.PRAISE,
      template: '剛剛的行車方式很穩定，謝謝您保持良好習慣。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3天前
    },
    {
      senderId: senders[0].id,
      receiverId: targetUser.id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您行李箱似乎未完全關好，行駛時請多注意。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5天前
    },
  ];

  await prisma.message.createMany({
    data: messages,
  });

  console.log(`✅ Created ${messages.length} mock messages for BBP-2999`);

  // 創建一些 BBP-2999 發送的消息（用於發送記錄頁面）
  const receivers = await Promise.all([
    prisma.user.upsert({
      where: { phone: '0900000004' },
      update: {},
      create: {
        phone: '0900000004',
        licensePlate: 'ABC-1234',
        nickname: '陳六',
        userType: UserType.driver,
        vehicleType: VehicleType.car,
        points: 12,
        hasCompletedOnboarding: true,
      },
    }),
    prisma.user.upsert({
      where: { phone: '0900000005' },
      update: {},
      create: {
        phone: '0900000005',
        licensePlate: 'XYZ-5678',
        nickname: '趙七',
        userType: UserType.driver,
        vehicleType: VehicleType.scooter,
        points: 18,
        hasCompletedOnboarding: true,
      },
    }),
  ]);

  // 刪除現有的發送消息（避免重複）
  await prisma.message.deleteMany({
    where: {
      senderId: targetUser.id,
    },
  });

  // 創建發送記錄
  const sentMessages = [
    {
      senderId: targetUser.id,
      receiverId: receivers[0].id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車燈似乎尚未開啟，行駛時請多注意安全。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30分鐘前
    },
    {
      senderId: targetUser.id,
      receiverId: receivers[1].id,
      type: MessageType.SAFETY_REMINDER,
      template: '剛剛變換車道時距離較近，提醒您多留意行車安全。',
      customText: '在高速公路上',
      read: false,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3小時前
    },
    {
      senderId: targetUser.id,
      receiverId: receivers[0].id,
      type: MessageType.PRAISE,
      template: '謝謝您剛剛的禮讓，讓行車更加順暢。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1天前
    },
    {
      senderId: targetUser.id,
      receiverId: receivers[1].id,
      type: MessageType.VEHICLE_REMINDER,
      template: '提醒您車門可能未完全關閉，為了安全請多留意。',
      customText: null,
      read: true,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2天前
    },
  ];

  await prisma.message.createMany({
    data: sentMessages,
  });

  console.log(`✅ Created ${sentMessages.length} sent messages for BBP-2999`);

  console.log('✅ Seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
