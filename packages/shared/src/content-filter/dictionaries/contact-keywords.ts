/**
 * 聯繫方式關鍵字詞庫
 * 用於檢測試圖交換聯繫方式的行為
 */

/**
 * LINE 相關關鍵字
 */
export const LINE_KEYWORDS = [
  // 直接提及
  'line', 'lineid', 'line id', 'line帳號', 'line號',
  // 諧音/變體（正規化後會變成這些）
  '賴', '萊', '來恩', '籟',
  // 行為動詞組合
  '加line', '加賴', '加我line', '加我賴',
  '加個line', '加個賴', '私line', '私賴',
  '聊line', '聊賴', '傳line', '傳賴',
  'line聯絡', '賴聯絡', 'line私', '賴私',
];

/**
 * 微信相關關鍵字
 */
export const WECHAT_KEYWORDS = [
  'wechat', 'weixin', '微信', '威信', '微訊',
  'wx', 'wx號', '微信號', '加微信', '加wx',
  '微信聯絡', '微信私', '私微信',
];

/**
 * 其他通訊軟體關鍵字
 */
export const OTHER_MESSENGER_KEYWORDS = [
  // Telegram
  'telegram', 'tg', '電報', 'tg群', 'tg號',
  // WhatsApp
  'whatsapp', 'wa', 'whats',
  // Discord
  'discord', 'dc', 'dc群', 'dc號',
  // Signal
  'signal',
  // Messenger
  'messenger', 'fb私訊',
];

/**
 * 社群平台關鍵字
 */
export const SOCIAL_PLATFORM_KEYWORDS = [
  // Instagram
  'instagram', 'ig', 'insta', '愛機', '哀居', 'ig帳號', 'ig號',
  '加ig', '私ig', 'ig私', '追蹤我', '追蹤ig',
  // Facebook
  'facebook', 'fb', '臉書', 'fb帳號', 'fb私訊', '臉書私訊',
  '加fb', '私fb', 'fb好友',
  // Twitter/X
  'twitter', '推特', 'x帳號',
  // TikTok
  'tiktok', '抖音', 'tk', '抖音號',
  // YouTube
  'youtube', 'yt', 'yt頻道',
  // 小紅書
  '小紅書', 'xhs',
];

/**
 * 交換聯繫方式的動作關鍵字
 */
export const CONTACT_ACTION_KEYWORDS = [
  '加我', '加一下', '私我', '私訊我', '聯絡我',
  '找我', '打給我', '撥給我', '傳給我', '聯繫我',
  '留電話', '留號碼', '留帳號', '給我帳號',
  '約出來', '約見面', '線下約', '私下約', '私約',
  '加好友', '加朋友', '交個朋友',
  '想認識', '認識一下', '交換一下',
  '怎麼聯絡', '怎麼找你', '怎麼加你',
  '連絡方式', '聯絡方式', '聯繫方式', '連繫方式',
];

/**
 * 所有聯繫方式關鍵字合併
 */
export const ALL_CONTACT_KEYWORDS = [
  ...LINE_KEYWORDS,
  ...WECHAT_KEYWORDS,
  ...OTHER_MESSENGER_KEYWORDS,
  ...SOCIAL_PLATFORM_KEYWORDS,
  ...CONTACT_ACTION_KEYWORDS,
];

/**
 * 檢測文字是否包含聯繫方式關鍵字
 * @param normalizedText 正規化後的文字
 * @returns 匹配到的關鍵字，若無則返回 null
 */
export function findContactKeyword(normalizedText: string): string | null {
  const lowerText = normalizedText.toLowerCase();

  for (const keyword of ALL_CONTACT_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }

  return null;
}

/**
 * 檢測是否有 LINE 相關內容
 */
export function hasLineContent(normalizedText: string): string | null {
  const lowerText = normalizedText.toLowerCase();

  for (const keyword of LINE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }

  return null;
}

/**
 * 檢測是否有社群平台相關內容
 */
export function hasSocialContent(normalizedText: string): string | null {
  const lowerText = normalizedText.toLowerCase();

  for (const keyword of SOCIAL_PLATFORM_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }

  return null;
}
