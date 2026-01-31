/**
 * 車牌語音解析測試腳本
 *
 * 用於測試 AI 對台灣車牌語音轉文字的解析準確度
 *
 * 執行方式：
 * npx ts-node src/drafts/test-voice-parser.ts
 */

import { VoiceParserService } from './voice-parser.service';
import * as dotenv from 'dotenv';

dotenv.config();

// 測試案例：模擬各種語音轉文字的結果
const testCases = [
  // ====== 基本測試 ======
  {
    name: '標準念法 - 英文字母分開',
    transcript: '前面那台白色的 A B C 一二三四 亂切車道',
    expectedPlate: 'ABC-1234',
    expectedCategory: 'SAFETY_REMINDER',
  },
  {
    name: '標準念法 - 英文連在一起',
    transcript: 'ABC 五六七八 那台黑色賓士 沒打方向燈',
    expectedPlate: 'ABC-5678',
    expectedCategory: 'SAFETY_REMINDER',
  },

  // ====== 口語化測試 ======
  {
    name: '口語化 - 阿逼西',
    transcript: '阿逼西 一二三四 那個白色休旅車 逼我超車',
    expectedPlate: 'ABC-1234',
    expectedCategory: 'SAFETY_REMINDER',
  },
  {
    name: '口語化 - 混合念法',
    transcript: '滴誒福 么兩三四 銀色 Camry 闖紅燈',
    expectedPlate: 'DEF-1234',
    expectedCategory: 'SAFETY_REMINDER',
  },

  // ====== 軍用讀法測試 ======
  {
    name: '軍用讀法 - 數字',
    transcript: 'ABC 么洞洞洞 那台摩托車 違規左轉',
    expectedPlate: 'ABC-1000',
    expectedCategory: 'SAFETY_REMINDER',
  },
  {
    name: '軍用讀法 - 拐、洞',
    transcript: '誒逼西 拐洞拐洞 紅色機車 蛇行',
    expectedPlate: 'ABC-7070',
    expectedCategory: 'SAFETY_REMINDER',
  },

  // ====== 機車車牌測試 ======
  {
    name: '機車車牌 - 3字母3數字',
    transcript: 'MNP 一二三 那台綠色機車 併排停車',
    expectedPlate: 'MNP-123',
    expectedCategory: 'SAFETY_REMINDER',
  },
  {
    name: '機車車牌 - 數字在前',
    transcript: '一二三 ABC 黑色機車 車燈沒開',
    expectedPlate: '123-ABC',
    expectedCategory: 'VEHICLE_REMINDER',
  },

  // ====== 車況提醒測試 ======
  {
    name: '車況提醒 - 輪胎沒氣',
    transcript: 'XYZ 九八七六 那台藍色的輪胎好像沒氣',
    expectedPlate: 'XYZ-9876',
    expectedCategory: 'VEHICLE_REMINDER',
  },
  {
    name: '車況提醒 - 車燈沒開',
    transcript: '前面那台 RST 四五六七 大燈沒開 很危險',
    expectedPlate: 'RST-4567',
    expectedCategory: 'VEHICLE_REMINDER',
  },

  // ====== 讚美測試 ======
  {
    name: '讚美 - 禮讓',
    transcript: 'GHI 三三三三 那位司機很好心讓我先過',
    expectedPlate: 'GHI-3333',
    expectedCategory: 'PRAISE',
  },
  {
    name: '讚美 - 感謝',
    transcript: '謝謝 JKL 八八八八 提醒我車門沒關好',
    expectedPlate: 'JKL-8888',
    expectedCategory: 'PRAISE',
  },

  // ====== 情緒化語音測試 ======
  {
    name: '情緒化 - 帶髒話',
    transcript: '靠北 那個 ABC 一二三四 是在逼什麼車啦',
    expectedPlate: 'ABC-1234',
    expectedCategory: 'SAFETY_REMINDER',
  },
  {
    name: '情緒化 - 抱怨',
    transcript: '真的很誇張欸 DEF 五六七八 開這麼快幹嘛',
    expectedPlate: 'DEF-5678',
    expectedCategory: 'SAFETY_REMINDER',
  },

  // ====== 模糊測試 ======
  {
    name: '模糊 - 部分聽不清',
    transcript: '好像是 ABX 還是 ABC 一二三四 白色的車',
    expectedPlate: 'ABC-1234', // 應該選擇有效的車牌格式
    expectedCategory: 'OTHER',
  },
  {
    name: '模糊 - 沒有明確車牌',
    transcript: '前面那台白色的車亂開',
    expectedPlate: null, // 無法識別
    expectedCategory: 'SAFETY_REMINDER',
  },

  // ====== 舊式車牌測試 ======
  {
    name: '舊式車牌 - 2字母',
    transcript: 'AB 一二三四 那台計程車',
    expectedPlate: 'AB-1234',
    expectedCategory: 'OTHER',
  },
  {
    name: '舊式車牌 - 數字在前',
    transcript: '一二三四 AB 那台很舊的車',
    expectedPlate: '1234-AB',
    expectedCategory: 'OTHER',
  },

  // ====== 地點資訊測試 ======
  {
    name: '包含地點',
    transcript: '在中山北路和民生東路口 ABC 一二三四 闖紅燈',
    expectedPlate: 'ABC-1234',
    expectedCategory: 'SAFETY_REMINDER',
    expectedLocation: '中山北路',
  },
];

async function runTests() {
  const parser = new VoiceParserService();

  console.log('🚗 車牌語音解析測試\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;
  const results: any[] = [];

  for (const testCase of testCases) {
    console.log(`\n📝 測試: ${testCase.name}`);
    console.log(`   輸入: "${testCase.transcript}"`);

    try {
      const result = await parser.parseVoiceContent(testCase.transcript);

      const topPlate = result.plates[0]?.plate || null;
      const plateMatch = topPlate === testCase.expectedPlate;
      const categoryMatch = result.event.category === testCase.expectedCategory;

      console.log(
        `   識別車牌: ${topPlate || '(無)'} ${plateMatch ? '✅' : '❌'} (期望: ${testCase.expectedPlate || '(無)'})`,
      );
      console.log(
        `   識別類別: ${result.event.category} ${categoryMatch ? '✅' : '❌'} (期望: ${testCase.expectedCategory})`,
      );

      if (result.plates.length > 1) {
        console.log(
          `   其他候選: ${result.plates
            .slice(1)
            .map((p) => p.plate)
            .join(', ')}`,
        );
      }

      if (result.suggestedMessage) {
        console.log(`   建議訊息: "${result.suggestedMessage.slice(0, 50)}..."`);
      }

      if (plateMatch && categoryMatch) {
        passed++;
        console.log('   結果: ✅ 通過');
      } else {
        failed++;
        console.log('   結果: ❌ 失敗');
      }

      results.push({
        name: testCase.name,
        plateMatch,
        categoryMatch,
        expected: testCase.expectedPlate,
        actual: topPlate,
        candidates: result.plates.map((p) => p.plate),
      });
    } catch (err: any) {
      console.log(`   錯誤: ${err.message}`);
      failed++;
      results.push({
        name: testCase.name,
        error: err.message,
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 測試結果統計\n');
  console.log(`   總測試數: ${testCases.length}`);
  console.log(`   通過: ${passed} (${((passed / testCases.length) * 100).toFixed(1)}%)`);
  console.log(`   失敗: ${failed} (${((failed / testCases.length) * 100).toFixed(1)}%)`);

  // 車牌識別準確度
  const plateAccuracy = results.filter((r) => r.plateMatch).length / results.length;
  console.log(`\n   車牌識別準確率: ${(plateAccuracy * 100).toFixed(1)}%`);

  // 首選正確率（第一個候選是正確的）
  const topPlateCorrect = results.filter((r) => r.actual === r.expected).length;
  console.log(`   首選正確率: ${((topPlateCorrect / results.length) * 100).toFixed(1)}%`);

  // 候選包含正確答案的比率
  const candidatesContainCorrect = results.filter((r) => r.candidates?.includes(r.expected)).length;
  console.log(
    `   候選包含正確答案: ${((candidatesContainCorrect / results.length) * 100).toFixed(1)}%`,
  );

  console.log('\n' + '='.repeat(60));
}

// 執行測試
runTests().catch(console.error);
