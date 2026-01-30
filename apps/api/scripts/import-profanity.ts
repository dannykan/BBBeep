/**
 * 匯入現有詞庫到資料庫
 *
 * 執行方式：
 * cd apps/api
 * DATABASE_URL="postgresql://..." npx ts-node scripts/import-profanity.ts
 */

import { PrismaClient, ProfanityCategory, ProfanitySeverity } from '@prisma/client';

const prisma = new PrismaClient();

// 從 shared package 複製的詞庫
const PROFANITY_WORDS = [
  // ===== 常見髒話 =====
  '幹', '幹你', '幹您', '干你', '干您',
  '靠', '靠北', '靠杯', '靠背', '靠么', '靠腰', '靠邀', '靠夭', '哭北', '哭夭', '尻',
  '媽的', '馬的', '他媽', '他馬', '你媽', '妳媽', '老母', '娘的',
  '操', '操你', '肏', '肏你', '草泥馬', '草你',
  '機掰', '雞掰', '機八', '雞八', '機巴', '雞巴', '基掰', '幾掰', '幾八', '基八', 'ㄐㄅ', '雞歪',
  '三小', '啥小', '殺小', '蝦小', '瞎小', '三洨', '啥洨', '沙小',

  // ===== 罵人笨/白目 =====
  '北七', '白癡', '白痴', '白目', '智障', '低能', '87', '八七', '白七',
  '蠢', '蠢蛋', '蠢貨', '笨蛋', '笨', '傻', '傻逼', '傻B', '腦殘', '沒腦', '無腦',
  '弱智', '腦子有洞', '腦袋裝屎', '豬腦', '豬頭', '呆子', '白爛',
  '二百五', '二貨', '憨', '憨狗', '憨包', '呆瓜',

  // ===== 罵人討厭/煩 =====
  '屁眼', '屁孩', '小屁孩', '死小孩', '死屁孩',
  '狗屎', '狗屁', '放屁', '屁話', '鬼話', '廢話',
  '廢物', '垃圾', '敗類', '人渣', '賤人', '賤貨', '賤', '下賤',
  '噁心', '噁', '嘔', '作嘔', '想吐',
  '討厭', '煩', '煩死', '吵死', '很煩', '好煩', '超煩',

  // ===== 叫人走開/去死 =====
  '去死', '快去死', '怎麼不去死', '去死吧', '死去',
  '閉嘴', '滾', '滾開', '滾蛋', '滾出去', '滾啦', '給我滾',
  '消失', '滾遠點', '別來煩', '走開',

  // ===== 罵人壞/不道德 =====
  '王八', '王八蛋', '龜兒子', '狗娘養', '雜種', '混蛋', '混帳',
  '畜生', '禽獸', '不是人', '沒人性', '沒良心',
  '可惡', '可恨', '該死',

  // ===== 台語髒話 =====
  '幹林', '幹林娘', '幹林老師', '幹林老母', '幹您娘', '幹妳娘', '幹你娘',
  '林北', '林杯', '恁爸', '恁北', '恁娘', '你爸', '你老師', '老師勒', '恁祖媽',
  '賽', '塞', '屎', '大便',
  '膣', '膣屄',
  '夭壽', '夭壽喔', '夭壽仔', '妖壽',
  '死囝仔', '死查某', '死查埔', '臭查某', '臭查埔',
  '靠爸', '靠母', '靠爸族', '靠勢',
  '番', '番仔', '番顛', '起番', '番癲',
  '俗辣', '俗仔', '孬種', '沒卵', '沒卵蛋', '沒種', '沒膽', '膽小鬼', '縮', '縮頭',
  '龜', '龜毛', '龜縮', '縮起來', '龜孫', '龜孫子',
  '豬哥', '色鬼', '色狼', '鹹豬手', '吃豆腐',
  '歹命', '衰', '衰小', '衰鬼', '帶賽', '觸霉頭', '烏鴉嘴',
  '顧人怨', '討人厭', '爛', '爛人', '爛貨', '爛咖',
  '破爛', '破銅爛鐵',
  '盧', '盧小', '盧洨', '歡', '歡北北',
  '機車', '很機車', '超機車', '機車人',
  '白目仔',
  '假仙', '假掰', '裝模作樣', '裝', '裝死', '裝傻', '裝蒜',
  '雞婆', '管很多', '愛管', '多管閒事',
  '奧客', '澳洲來的',
  '落漆', '漏氣', '漏屎', '漏尿',
  '觸', '觸小',
  '哭爸', '哭母', '哭哭',
  '抓狂', '起肖', '發瘋', '瘋了', '瘋子', '起笑',
  '搞屁', '搞毛', '搞什麼', '在搞',
  '三八', '38', '三八阿花',
  '肖查某', '肖仔', '神經', '神經質',
  '哈囉', '是在哈囉', '哈', '蛤',
  '厚', '厚話', '厚臉皮', '臉皮厚',
  '痞', '痞子', '流氓', '混混', '8+9', '八加九', '八嘎囧',
  '草莓族', '媽寶', '爸寶',
  '阿達', '阿答', '秀逗', '腦袋秀逗',
  '瞎', '瞎咧', '瞎爆', '瞎透',
  '扯', '太扯', '扯爆', '扯淡', '鬼扯',
  '誇張', '很誇張', '太誇張',
  '離譜', '很離譜', '太離譜', '超離譜',
  '傻眼', '傻眼貓咪', '無言', '無語',
  '莫名其妙', '無理取鬧', '沒道理',

  // ===== 質疑性/攻擊性語句 =====
  '會不會開車', '不會開車', '眼睛長哪', '眼睛呢', '有沒有眼睛',
  '瞎了', '眼瞎', '瞎了眼', '眼睛瞎',
  '有事嗎', '腦子有問題', '有毛病',
  '你在幹嘛',
  '什麼東西', '什麼玩意', '啥玩意',

  // ===== 嘲諷/挑釁 =====
  '厲害喔', '好棒喔', '好厲害', '神經病', '有病', '腦子壞了',
  '笑死', '笑屎', '笑死人', '可笑', '好笑',
  '活該', '自找的', '自作自受', '報應',

  // ===== 性相關不當用語 =====
  '屌', '懶叫', '懶覺', 'lj', '老二', '小弟弟',
  '奶子',
  '騷', '騷貨', '淫', '淫蕩', '變態', '色胚',
  '婊', '婊子', '妓女', '援交', '破麻',

  // ===== 網路用語 =====
  '吃屎', '吃大便',
  '可撥', '可悲',
  '嗆', '嗆屁', '嗆什麼',
  '酸', '酸民', '酸什麼',
  '噴', '噴子', '亂噴',
  '崩潰', '氣死', '氣炸',
];

const THREAT_WORDS = [
  '殺', '殺了你', '殺死', '砍', '砍死', '弄死', '打死', '整死',
  '揍', '揍你', '揍死', '打你', '打爆', '扁你', '扁死', '修理你',
  '踹', '踹死', '踢死', '踢爆',
  '撞', '撞死', '撞爆', '輾', '輾過',
  '等著瞧', '等著看', '有你好看', '好看', '走著瞧',
  '小心點', '給我小心', '放尊重', '給我放', '最好',
  '找人', '找兄弟', '找人收拾', '叫人', '叫兄弟',
  '報復', '後果', '後果自負', '自己負責', '別怪我',
  '威脅', '恐嚇', '讓你', '讓你知道', '給你好看',
  '你完了', '完蛋了', '死定了', '等死', '玩完了',
  '小心你的車', '小心車子', '記住你', '記住你的車',
  '知道你住哪', '找到你', '讓你好看',
  '詛咒', '下地獄', '不得好死', '斷子絕孫',
  '出門被車撞', '全家', '全家死', '你全家',
];

const HARASSMENT_WORDS = [
  '約炮', '約砲', '一夜', '一夜情',
  '帥哥', '美女', '妹子', '小姐姐', '正妹', '辣妹',
  '想認識', '交個朋友', '聊聊', '私聊', '密我',
  '單身', '有男友', '有女友', '有對象',
  '幾歲', '住哪', '在哪', '哪裡人',
  '電話', '手機', '號碼', '加我', '加好友', 'line', 'ig',
  '跟蹤', '偷拍', '偷看', '監視',
  '知道你家', '找到你家', '等你下班',
];

const DISCRIMINATION_WORDS = [
  '女司機', '女人開車', '母豬', '台女', '綠茶', '綠茶婊',
  '娘炮', '娘娘腔', '人妖', '死gay', '死同',
  '426', '阿陸', '阿六', '支那', '強國人',
  '南部人', '鄉下人', '台巴子',
  '殘廢', '瞎子', '聾子', '啞巴', '瘸子', '跛腳',
  '精神病', '瘋婆',
  '老人家', '老頭', '老太婆', '老不死', '老廢物',
  '三寶', '馬路三寶',
  '外勞', '外傭',
  '窮鬼', '乞丐', '魯蛇', 'loser',
];

// 高嚴重度詞彙
const HIGH_SEVERITY = [
  '幹你娘', '幹您娘', '操你媽', '肏你媽', '幹林娘',
  '去死', '快去死', '怎麼不去死', '去死吧',
  '支那', '母豬',
  '殺', '殺了你', '殺死', '砍死', '弄死', '打死',
  '詛咒', '不得好死', '斷子絕孫',
];

// 中嚴重度詞彙
const MEDIUM_SEVERITY = [
  '幹', '靠', '靠北', '靠杯', '媽的', '機掰', '雞掰',
  '白癡', '白目', '智障', '廢物', '垃圾', '腦殘',
  '滾', '閉嘴', '噁心',
  '威脅', '恐嚇', '報復',
];

function getSeverity(word: string): ProfanitySeverity {
  if (HIGH_SEVERITY.includes(word)) return 'HIGH';
  if (MEDIUM_SEVERITY.includes(word)) return 'MEDIUM';
  return 'LOW';
}

async function main() {
  console.log('='.repeat(50));
  console.log('匯入詞庫到資料庫');
  console.log('='.repeat(50));
  console.log('');

  const allWords: Array<{ word: string; category: ProfanityCategory; severity: ProfanitySeverity }> = [];

  // 處理各類別
  for (const word of PROFANITY_WORDS) {
    allWords.push({ word, category: 'PROFANITY', severity: getSeverity(word) });
  }
  for (const word of THREAT_WORDS) {
    allWords.push({ word, category: 'THREAT', severity: getSeverity(word) });
  }
  for (const word of HARASSMENT_WORDS) {
    allWords.push({ word, category: 'HARASSMENT', severity: getSeverity(word) });
  }
  for (const word of DISCRIMINATION_WORDS) {
    allWords.push({ word, category: 'DISCRIMINATION', severity: getSeverity(word) });
  }

  console.log(`準備匯入 ${allWords.length} 個詞彙`);
  console.log(`- 髒話/粗話: ${PROFANITY_WORDS.length}`);
  console.log(`- 威脅性言語: ${THREAT_WORDS.length}`);
  console.log(`- 騷擾性言語: ${HARASSMENT_WORDS.length}`);
  console.log(`- 歧視性言語: ${DISCRIMINATION_WORDS.length}`);
  console.log('');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of allWords) {
    try {
      await prisma.profanityWord.upsert({
        where: { word: item.word },
        create: {
          word: item.word,
          category: item.category,
          severity: item.severity,
          isActive: true,
        },
        update: {
          category: item.category,
          severity: item.severity,
        },
      });
      created++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        skipped++;
      } else {
        console.error(`Error importing "${item.word}":`, error.message);
        errors++;
      }
    }
  }

  // 建立初始版本
  await prisma.profanityDictVersion.create({
    data: { description: '初始匯入' },
  });

  console.log('匯入完成！');
  console.log(`- 新增: ${created}`);
  console.log(`- 跳過: ${skipped}`);
  console.log(`- 錯誤: ${errors}`);
  console.log('');

  // 顯示統計
  const stats = await prisma.profanityWord.groupBy({
    by: ['category'],
    _count: { id: true },
  });

  console.log('資料庫統計：');
  for (const s of stats) {
    console.log(`- ${s.category}: ${s._count.id}`);
  }
}

main()
  .catch((e) => {
    console.error('匯入失敗：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
