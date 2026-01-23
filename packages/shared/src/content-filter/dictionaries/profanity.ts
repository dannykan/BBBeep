/**
 * 不當言語詞庫
 * 包含髒話、威脅、騷擾、歧視等不當內容
 *
 * 注意：此詞庫用於內容過濾，保護用戶免受不當內容影響
 */

/**
 * 髒話/粗話（台灣常見）
 */
export const PROFANITY_WORDS = [
  // 常見髒話
  '幹', '幹你', '幹您', '干你', '干您',
  '靠北', '靠杯', '靠背', '靠么', '靠腰',
  '媽的', '馬的', '他媽', '他馬', '你媽', '妳媽',
  '操', '操你', '肏', '肏你',
  '機掰', '雞掰', '機八', '雞八', '機巴', '雞巴', '基掰',
  '三小', '啥小', '殺小', '蝦小', '瞎小',
  '北七', '白癡', '白痴', '智障', '低能',
  '屁眼', '屁孩', '小屁孩',
  '去死', '快去死', '怎麼不去死',
  '狗屎', '狗屁', '放屁', '屁話',
  '廢物', '垃圾', '敗類', '人渣', '賤人', '賤貨',
  '王八', '王八蛋', '龜兒子', '狗娘養',
  '閉嘴', '滾', '滾開', '滾蛋', '滾出去',

  // 性相關不當用語
  '雞巴', '屌', '懶叫', '懶覺', 'lj',
  '奶子', '奶奶', // 在不當語境
  '騷', '騷貨', '淫', '淫蕩',
  '婊', '婊子', '妓女', '援交',

  // 諧音/變體
  '㊣', 'ㄍㄢˋ', 'ㄇㄉ', 'ㄐㄅ', 'ㄎㄅ',
  'gan', 'gann', 'fxxk', 'fk', 'wtf', 'stfu',
];

/**
 * 威脅性言語
 */
export const THREAT_WORDS = [
  '殺', '殺了你', '砍', '砍死', '弄死', '打死',
  '揍', '揍你', '打你', '扁你', '修理你',
  '等著瞧', '等著看', '有你好看', '好看',
  '小心點', '給我小心', '放尊重', '給我放',
  '找人', '找兄弟', '找人收拾', '叫人',
  '報復', '後果', '後果自負', '自己負責',
  '威脅', '恐嚇', '讓你', '讓你知道',
  '你完了', '完蛋了', '死定了', '等死',
];

/**
 * 騷擾性言語
 */
export const HARASSMENT_WORDS = [
  '約炮', '約砲', '一夜', '一夜情', '約會', // 約會在此語境不當
  '帥哥', '美女', '妹子', '小姐姐', // 搭訕用語
  '想認識', '交個朋友', '聊聊', '私聊', // 搭訕用語（在提醒平台不當）
  '單身', '有男友', '有女友', '有對象',
  '幾歲', '住哪', '在哪', '哪裡人',
  '電話', '手機', '號碼', '加我', // 索取聯繫方式（在提醒平台不當）
];

/**
 * 歧視性言語
 */
export const DISCRIMINATION_WORDS = [
  // 性別歧視
  '女司機', '女人開車', '母豬', '台女', '綠茶',

  // 地域歧視
  '426', '阿陸', '阿六', '支那',

  // 身心障礙歧視
  '殘廢', '瞎子', '聾子', '啞巴', '瘸子',

  // 其他歧視
  '外勞', '外傭', // 應使用「移工」「外籍看護」
];

/**
 * 所有不當言語合併
 */
export const ALL_PROFANITY = [
  ...PROFANITY_WORDS,
  ...THREAT_WORDS,
  // 騷擾和歧視詞在 BBBeep 語境下判定較寬鬆，不納入自動阻擋
];

/**
 * 高嚴重度詞彙（立即阻擋）
 */
export const HIGH_SEVERITY_WORDS = [
  ...THREAT_WORDS,
  // 極端髒話
  '幹你娘', '幹您娘', '操你媽', '肏你媽',
  '去死', '快去死', '怎麼不去死',
];

/**
 * 中嚴重度詞彙
 */
export const MEDIUM_SEVERITY_WORDS = [
  '幹', '靠北', '靠杯', '媽的', '機掰', '雞掰',
  '白癡', '智障', '廢物', '垃圾',
];

/**
 * 檢測是否包含高嚴重度詞彙
 */
export function hasHighSeverityWord(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const word of HIGH_SEVERITY_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

/**
 * 檢測是否包含任何不當言語
 * @returns 匹配到的詞彙，若無則返回 null
 */
export function findProfanity(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const word of ALL_PROFANITY) {
    if (lowerText.includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

/**
 * 取得詞彙的嚴重程度
 */
export function getProfanitySeverity(word: string): 'low' | 'medium' | 'high' {
  const lowerWord = word.toLowerCase();

  if (HIGH_SEVERITY_WORDS.some(w => lowerWord.includes(w.toLowerCase()))) {
    return 'high';
  }

  if (MEDIUM_SEVERITY_WORDS.some(w => lowerWord.includes(w.toLowerCase()))) {
    return 'medium';
  }

  return 'low';
}
