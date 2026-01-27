/**
 * 點數規則設定檔
 * 所有點數相關的規則都集中在這裡管理
 *
 * 修改此檔案後，所有使用點數的功能都會自動套用新規則
 */

export const POINTS_CONFIG = {
  // ============================================
  // 一、訊息發送成本
  // ============================================

  message: {
    /**
     * 讚美類提醒（鼓勵正向互動）
     */
    praise: {
      template: 0,        // 使用系統模板
      customWithAi: 2,    // 自訂文字 + AI 優化
      customWithoutAi: 4, // 自訂文字（無 AI）
    },

    /**
     * 其他提醒（車況提醒、行車安全提醒）
     */
    other: {
      template: 1,        // 使用系統模板
      customWithAi: 2,    // 自訂文字 + AI 優化
      customWithoutAi: 4, // 自訂文字（無 AI）
    },

    /**
     * 回覆訊息成本
     */
    reply: {
      quickReply: 0,      // 快速回覆（預設文字）
      customWithAi: 2,    // 自訂回覆 + AI 優化
      customWithoutAi: 4, // 自訂回覆（無 AI）
    },
  },

  // ============================================
  // 二、語音提醒
  // ============================================

  voice: {
    enabled: true,        // 是否啟用語音功能
    maxDuration: 15,      // 最大秒數
    cost: 8,              // 發送成本
    trialMaxUsage: 2,     // 試用期最多使用次數
  },

  // ============================================
  // 三、獎勵機制
  // ============================================

  rewards: {
    /**
     * 正向回饋獎勵
     * 當接收方對讚美給予正向回饋時，發送方獲得獎勵
     */
    positiveFeedback: {
      enabled: true,
      amount: 1,          // 獎勵點數
    },

    /**
     * 邀請獎勵（由 invite 模組管理，這裡僅供參考）
     */
    invite: {
      inviterBonus: 5,    // 邀請人獲得
      inviteeBonus: 5,    // 被邀請人獲得
    },
  },

  // ============================================
  // 四、試用期規則
  // ============================================

  trial: {
    enabled: true,        // 是否啟用試用期機制
    durationDays: 7,      // 試用天數
    initialPoints: 50,    // 試用起始點數
    carryOverPoints: false, // 試用結束後是否保留剩餘點數
  },

  // ============================================
  // 五、試用結束後（基本模式）
  // ============================================

  basic: {
    /**
     * 一次性贈送點數（試用結束時）
     */
    oneTimeBonus: {
      enabled: true,
      amount: 2,
    },

    /**
     * 每日免費點數
     */
    dailyFreePoints: {
      enabled: false,     // 規則：試用結束後不提供每日免費
      amount: 0,
    },

    /**
     * 基本模式限制
     */
    restrictions: {
      canUseVoice: false, // 不可使用語音提醒
    },
  },

  // ============================================
  // 六、舊版相容（過渡期使用，之後移除）
  // ============================================

  legacy: {
    /**
     * 每日免費點數（舊版）
     * 設為 0 以符合新規則
     */
    dailyFreePoints: 2,

    /**
     * 是否使用舊版點數計算
     * true: 使用舊版邏輯（系統模板1點 + 自訂3點 + AI 1點）
     * false: 使用新版邏輯（依據上方設定）
     */
    useLegacyCalculation: false,
  },
} as const;

// ============================================
// 輔助函數
// ============================================

export type MessageCategory = 'praise' | 'other';
export type MessageMode = 'template' | 'customWithAi' | 'customWithoutAi';
export type ReplyMode = 'quickReply' | 'customWithAi' | 'customWithoutAi';

/**
 * 計算訊息發送成本
 */
export function getMessageCost(
  category: MessageCategory,
  hasCustomText: boolean,
  useAiRewrite: boolean
): number {
  const config = POINTS_CONFIG.message[category];

  if (!hasCustomText) {
    return config.template;
  }

  return useAiRewrite ? config.customWithAi : config.customWithoutAi;
}

/**
 * 計算回覆成本
 */
export function getReplyCost(
  isQuickReply: boolean,
  useAiRewrite: boolean
): number {
  const config = POINTS_CONFIG.message.reply;

  if (isQuickReply) {
    return config.quickReply;
  }

  return useAiRewrite ? config.customWithAi : config.customWithoutAi;
}

/**
 * 檢查是否在試用期內
 */
export function isInTrialPeriod(trialStartDate: Date | null): boolean {
  if (!POINTS_CONFIG.trial.enabled || !trialStartDate) {
    return false;
  }

  const now = new Date();
  const trialEnd = new Date(trialStartDate);
  trialEnd.setDate(trialEnd.getDate() + POINTS_CONFIG.trial.durationDays);

  return now < trialEnd;
}

/**
 * 取得每日免費點數數量
 */
export function getDailyFreePointsAmount(isInTrial: boolean): number {
  if (isInTrial) {
    // 試用期間不需要每日補點（因為有 50 點）
    return 0;
  }

  if (POINTS_CONFIG.basic.dailyFreePoints.enabled) {
    return POINTS_CONFIG.basic.dailyFreePoints.amount;
  }

  return 0;
}

/**
 * 取得語音訊息發送成本
 */
export function getVoiceMessageCost(): number {
  return POINTS_CONFIG.voice.cost;
}

/**
 * 檢查語音功能是否啟用
 */
export function isVoiceEnabled(): boolean {
  return POINTS_CONFIG.voice.enabled;
}

/**
 * 取得語音最大秒數
 */
export function getVoiceMaxDuration(): number {
  return POINTS_CONFIG.voice.maxDuration;
}
