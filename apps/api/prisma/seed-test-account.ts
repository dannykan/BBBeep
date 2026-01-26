/**
 * Seed Test Account for App Store Review
 * 為 App Store 審核建立測試帳號和 mock data
 *
 * 執行方式：
 * cd apps/api
 * npx ts-node prisma/seed-test-account.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 測試帳號設定
const TEST_LICENSE_PLATE = 'BBP2999';
const TEST_PASSWORD = '12345678';

async function main() {
  console.log('🚀 開始建立測試帳號和 mock data...\n');

  // 1. 找到測試帳號
  const testUser = await prisma.user.findFirst({
    where: { licensePlate: TEST_LICENSE_PLATE },
  });

  if (!testUser) {
    console.error(`❌ 找不到車牌為 ${TEST_LICENSE_PLATE} 的帳號`);
    console.log('請先確保此車牌已註冊');
    return;
  }

  console.log(`✅ 找到測試帳號: ${testUser.id}`);
  console.log(`   車牌: ${testUser.licensePlate}`);
  console.log(`   暱稱: ${testUser.nickname || '(未設定)'}\n`);

  // 2. 設置密碼
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
  await prisma.user.update({
    where: { id: testUser.id },
    data: {
      password: hashedPassword,
      hasCompletedOnboarding: true,
      points: 100, // 給足夠的點數
      freePoints: 10,
    },
  });
  console.log(`✅ 已設置密碼: ${TEST_PASSWORD}`);
  console.log(`✅ 已設置點數: 100 點 + 10 免費點\n`);

  // 3. 建立一個假的發送者帳號（用於發送訊息給測試帳號）
  let mockSender = await prisma.user.findFirst({
    where: { licensePlate: 'MOCK001' },
  });

  if (!mockSender) {
    mockSender = await prisma.user.create({
      data: {
        licensePlate: 'MOCK001',
        nickname: '熱心路人',
        userType: 'driver',
        vehicleType: 'car',
        hasCompletedOnboarding: true,
      },
    });
    console.log('✅ 建立 mock 發送者帳號: MOCK001\n');
  }

  // 建立另一個 mock 用戶用於接收測試帳號發送的訊息
  let mockReceiver = await prisma.user.findFirst({
    where: { licensePlate: 'MOCK002' },
  });

  if (!mockReceiver) {
    mockReceiver = await prisma.user.create({
      data: {
        licensePlate: 'MOCK002',
        nickname: '測試車主',
        userType: 'driver',
        vehicleType: 'scooter',
        hasCompletedOnboarding: true,
      },
    });
    console.log('✅ 建立 mock 接收者帳號: MOCK002\n');
  }

  // 4. 建立收到的提醒訊息（測試帳號是 receiver）
  const receivedMessages = [
    {
      type: 'VEHICLE_REMINDER' as const,
      template: '您的車燈沒關',
      customText: '您停在路邊的車大燈還亮著，可能會沒電喔！',
      location: '台北市信義區松仁路100號',
      occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小時前
      read: false,
    },
    {
      type: 'SAFETY_REMINDER' as const,
      template: '行車時請注意安全',
      customText: '剛才在高速公路上看到您切換車道沒打方向燈，請小心安全！',
      location: '國道一號 北上 35K',
      occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1天前
      read: true,
    },
    {
      type: 'PRAISE' as const,
      template: '感謝您的禮讓',
      customText: '謝謝您在斑馬線前禮讓行人，您真是好車主！',
      location: '台北市大安區忠孝東路四段',
      occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
      read: true,
    },
    {
      type: 'VEHICLE_REMINDER' as const,
      template: '您的後車廂沒關好',
      location: '新北市板橋區文化路一段',
      occurredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
      read: true,
    },
  ];

  console.log('📨 建立收到的提醒訊息...');
  for (const msg of receivedMessages) {
    await prisma.message.create({
      data: {
        ...msg,
        senderId: mockSender.id,
        receiverId: testUser.id,
        createdAt: msg.occurredAt || new Date(),
      },
    });
  }
  console.log(`✅ 已建立 ${receivedMessages.length} 則收到的訊息\n`);

  // 5. 建立發送紀錄（測試帳號是 sender）
  const sentMessages = [
    {
      type: 'VEHICLE_REMINDER' as const,
      template: '您的車門沒關好',
      customText: '看到您的副駕駛座車門沒關緊，請注意！',
      location: '台北市中山區南京東路二段',
      occurredAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6小時前
    },
    {
      type: 'PRAISE' as const,
      template: '您的駕駛技術很好',
      location: '台北市內湖區內湖路一段',
      occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
    },
    {
      type: 'SAFETY_REMINDER' as const,
      template: '請繫安全帶',
      customText: '看到您的後座乘客沒繫安全帶，請提醒他們注意安全',
      location: '桃園市中壢區中央西路',
      occurredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4天前
    },
  ];

  console.log('📤 建立發送紀錄...');
  for (const msg of sentMessages) {
    await prisma.message.create({
      data: {
        ...msg,
        senderId: testUser.id,
        receiverId: mockReceiver.id,
        read: true,
        createdAt: msg.occurredAt || new Date(),
      },
    });
  }
  console.log(`✅ 已建立 ${sentMessages.length} 則發送紀錄\n`);

  // 6. 建立語音草稿
  const drafts = [
    {
      voiceUrl: 'https://example.com/mock-voice-1.m4a',
      voiceDuration: 8,
      transcript: '前面那台白色 Toyota 的車燈沒關',
      parsedPlates: ['ABC-1234'],
      parsedVehicle: { type: 'car', color: '白色', brand: 'Toyota' },
      parsedEvent: { type: 'light_on', category: 'VEHICLE_REMINDER', description: '車燈未關' },
      suggestedMessage: '您的車燈還亮著，可能會沒電喔！',
      latitude: 25.0330,
      longitude: 121.5654,
      address: '台北市信義區信義路五段',
      status: 'READY' as const,
      expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000), // 20小時後過期
    },
    {
      voiceUrl: 'https://example.com/mock-voice-2.m4a',
      voiceDuration: 12,
      transcript: '那台黑色的機車騎太快了差點撞到人',
      parsedPlates: ['XYZ-789'],
      parsedVehicle: { type: 'scooter', color: '黑色' },
      parsedEvent: { type: 'speeding', category: 'SAFETY_REMINDER', description: '超速行駛' },
      suggestedMessage: '請注意車速，行人的安全也很重要！',
      latitude: 25.0478,
      longitude: 121.5170,
      address: '台北市中山區民權東路',
      status: 'READY' as const,
      expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
    },
  ];

  console.log('📝 建立語音草稿...');
  for (const draft of drafts) {
    await prisma.voiceDraft.create({
      data: {
        ...draft,
        userId: testUser.id,
        parsedVehicle: draft.parsedVehicle,
        parsedEvent: draft.parsedEvent,
      },
    });
  }
  console.log(`✅ 已建立 ${drafts.length} 則語音草稿\n`);

  // 7. 建立點數紀錄
  const pointHistory = [
    {
      type: 'bonus' as const,
      amount: 50,
      description: '新用戶註冊獎勵',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
    },
    {
      type: 'spend' as const,
      amount: -2,
      description: '發送提醒訊息（文字）',
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'bonus' as const,
      amount: 10,
      description: '邀請好友獎勵',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'spend' as const,
      amount: -1,
      description: '發送提醒訊息（範本）',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'spend' as const,
      amount: -6,
      description: '發送語音訊息',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'recharge' as const,
      amount: 50,
      description: '購買點數 - 50點方案',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'spend' as const,
      amount: -2,
      description: '發送 AI 優化訊息',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  console.log('💰 建立點數紀錄...');
  for (const history of pointHistory) {
    await prisma.pointHistory.create({
      data: {
        ...history,
        userId: testUser.id,
      },
    });
  }
  console.log(`✅ 已建立 ${pointHistory.length} 則點數紀錄\n`);

  // 總結
  console.log('========================================');
  console.log('🎉 測試帳號設置完成！\n');
  console.log('App Store 審核資訊：');
  console.log('----------------------------------------');
  console.log(`車牌號碼：${TEST_LICENSE_PLATE}`);
  console.log(`密碼：${TEST_PASSWORD}`);
  console.log('----------------------------------------');
  console.log('\n登入方式：');
  console.log('1. 開啟 App');
  console.log('2. 點擊「登入」');
  console.log('3. 點擊「使用車牌登入」');
  console.log(`4. 輸入車牌：${TEST_LICENSE_PLATE}`);
  console.log(`5. 輸入密碼：${TEST_PASSWORD}`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ 錯誤：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
