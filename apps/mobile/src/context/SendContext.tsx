/**
 * Send Context
 * 用於在發送提醒各步驟之間共享狀態
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { aiApi, filterContent, type ContentFilterResult, type AiModerationResponse } from '@bbbeeep/shared';
import type { VehicleType, MessageType } from '@bbbeeep/shared';
import { checkProfanityFromSync } from '../lib/profanitySync';

type ReminderCategory = '車況提醒' | '行車安全' | '讚美感謝' | '其他情況';
type SendMode = 'text' | 'voice' | 'ai' | 'template';

interface VoiceRecording {
  uri: string;
  duration: number;
  transcript: string;
}

// 語音備忘（快速錄音帶入的資料）
export interface VoiceMemo {
  uri: string;
  duration: number;
  transcript?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  recordedAt: Date;
}

interface SendState {
  // Vehicle and plate
  vehicleType: VehicleType | null;
  targetPlate: string;
  plateInput: string;

  // Category and situation
  selectedCategory: ReminderCategory | null;
  selectedSituation: string;
  generatedMessage: string;

  // Custom and AI
  customText: string;
  aiSuggestion: string;
  useAiVersion: boolean;
  usedAi: boolean;
  aiLimit: { canUse: boolean; remaining: number };

  // Location and time
  location: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  occurredAt: Date;
  selectedTimeOption: 'now' | '5min' | '10min' | '15min' | 'custom';

  // Loading
  isLoading: boolean;

  // Content filter
  contentWarning: string | null;
  contentFilterResult: ContentFilterResult | null;

  // AI Moderation
  aiModeration: AiModerationResponse | null;
  isAiModerating: boolean;
  voiceModeration: AiModerationResponse | null; // 語音轉文字的審核結果
  textModeration: AiModerationResponse | null;  // 用戶編輯文字的審核結果

  // Voice
  voiceRecording: VoiceRecording | null;
  voiceUrl: string | null;
  sendMode: SendMode;

  // Voice Memo (from quick recording)
  voiceMemo: VoiceMemo | null;
}

interface SendContextType extends SendState {
  // Setters
  setVehicleType: (type: VehicleType | null) => void;
  setTargetPlate: (plate: string) => void;
  setPlateInput: (input: string) => void;
  setSelectedCategory: (category: ReminderCategory | null) => void;
  setSelectedSituation: (situation: string) => void;
  setGeneratedMessage: (message: string) => void;
  setCustomText: (text: string) => void;
  setAiSuggestion: (suggestion: string) => void;
  setUseAiVersion: (use: boolean) => void;
  setUsedAi: (used: boolean) => void;
  setAiLimit: (limit: { canUse: boolean; remaining: number }) => void;
  setLocation: (location: string, latitude?: number, longitude?: number) => void;
  setOccurredAt: (date: Date) => void;
  setSelectedTimeOption: (option: 'now' | '5min' | '10min' | '15min' | 'custom') => void;
  setIsLoading: (loading: boolean) => void;

  // Voice setters
  setVoiceRecording: (recording: VoiceRecording | null) => void;
  setVoiceUrl: (url: string | null) => void;
  setSendMode: (mode: SendMode) => void;
  setVoiceMemo: (memo: VoiceMemo | null) => void;

  // Helpers
  resetSend: () => void;
  clearVoice: () => void;
  checkAiLimit: () => Promise<void>;
  getMessageType: () => MessageType;
  getPointCost: () => number;
  getFinalMessage: () => string;
  checkContentFilter: (text: string) => void;
  checkAiModeration: (text: string) => Promise<void>;
  checkVoiceModeration: (transcript: string) => Promise<void>;
  checkTextModeration: (text: string) => Promise<void>;
  getCombinedModerationWarning: () => { hasIssue: boolean; voiceIssue: boolean; textIssue: boolean; message: string | null };
  validateContent: (text: string) => { isValid: boolean; message: string | null };
  isVoiceMode: () => boolean;
  optimizeWithAi: (text: string) => Promise<string | null>;
}

const SendContext = createContext<SendContextType | null>(null);

const initialState: SendState = {
  vehicleType: null,
  targetPlate: '',
  plateInput: '',
  selectedCategory: null,
  selectedSituation: '',
  generatedMessage: '',
  customText: '',
  aiSuggestion: '',
  useAiVersion: false,
  usedAi: false,
  aiLimit: { canUse: true, remaining: 5 },
  location: '',
  locationLatitude: null,
  locationLongitude: null,
  occurredAt: new Date(),
  selectedTimeOption: 'now',
  isLoading: false,
  contentWarning: null,
  contentFilterResult: null,
  // AI Moderation
  aiModeration: null,
  isAiModerating: false,
  voiceModeration: null,
  textModeration: null,
  // Voice
  voiceRecording: null,
  voiceUrl: null,
  sendMode: 'text',
  // Voice Memo
  voiceMemo: null,
};

export function SendProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SendState>(initialState);

  // Check AI limit on mount
  useEffect(() => {
    checkAiLimit();
  }, []);

  const setVehicleType = useCallback((type: VehicleType | null) => {
    setState((prev) => ({ ...prev, vehicleType: type }));
  }, []);

  const setTargetPlate = useCallback((plate: string) => {
    setState((prev) => ({ ...prev, targetPlate: plate }));
  }, []);

  const setPlateInput = useCallback((input: string) => {
    setState((prev) => ({ ...prev, plateInput: input }));
  }, []);

  const setSelectedCategory = useCallback((category: ReminderCategory | null) => {
    setState((prev) => ({ ...prev, selectedCategory: category }));
  }, []);

  const setSelectedSituation = useCallback((situation: string) => {
    setState((prev) => ({ ...prev, selectedSituation: situation }));
  }, []);

  const setGeneratedMessage = useCallback((message: string) => {
    setState((prev) => ({ ...prev, generatedMessage: message }));
  }, []);

  const setCustomText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, customText: text }));
  }, []);

  const setAiSuggestion = useCallback((suggestion: string) => {
    setState((prev) => ({ ...prev, aiSuggestion: suggestion }));
  }, []);

  const setUseAiVersion = useCallback((use: boolean) => {
    setState((prev) => ({ ...prev, useAiVersion: use }));
  }, []);

  const setUsedAi = useCallback((used: boolean) => {
    setState((prev) => ({ ...prev, usedAi: used }));
  }, []);

  const setAiLimit = useCallback((limit: { canUse: boolean; remaining: number }) => {
    setState((prev) => ({ ...prev, aiLimit: limit }));
  }, []);

  const setLocation = useCallback((location: string, latitude?: number, longitude?: number) => {
    setState((prev) => ({
      ...prev,
      location: location,
      locationLatitude: latitude ?? null,
      locationLongitude: longitude ?? null,
    }));
  }, []);

  const setOccurredAt = useCallback((date: Date) => {
    setState((prev) => ({ ...prev, occurredAt: date }));
  }, []);

  const setSelectedTimeOption = useCallback((option: 'now' | '5min' | '10min' | '15min' | 'custom') => {
    setState((prev) => ({ ...prev, selectedTimeOption: option }));
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const setVoiceRecording = useCallback((recording: VoiceRecording | null) => {
    setState((prev) => ({ ...prev, voiceRecording: recording }));
  }, []);

  const setVoiceUrl = useCallback((url: string | null) => {
    setState((prev) => ({ ...prev, voiceUrl: url }));
  }, []);

  const setSendMode = useCallback((mode: SendMode) => {
    setState((prev) => ({ ...prev, sendMode: mode }));
  }, []);

  const setVoiceMemo = useCallback((memo: VoiceMemo | null) => {
    setState((prev) => ({ ...prev, voiceMemo: memo }));
  }, []);

  const clearVoice = useCallback(() => {
    setState((prev) => ({
      ...prev,
      voiceRecording: null,
      voiceUrl: null,
      sendMode: 'text',
    }));
  }, []);

  const resetSend = useCallback(() => {
    setState({
      ...initialState,
      aiLimit: state.aiLimit, // Keep AI limit
    });
  }, [state.aiLimit]);

  const checkAiLimit = useCallback(async () => {
    try {
      const limit = await aiApi.checkLimit();
      setState((prev) => ({ ...prev, aiLimit: limit }));
    } catch (error) {
      console.error('Failed to check AI limit:', error);
    }
  }, []);

  const getMessageType = useCallback((): MessageType => {
    switch (state.selectedCategory) {
      case '車況提醒':
        return '車況提醒';
      case '行車安全':
        return '行車安全提醒';
      case '讚美感謝':
        return '讚美感謝';
      case '其他情況':
        return '行車安全提醒';
      default:
        return '車況提醒';
    }
  }, [state.selectedCategory]);

  // 2026-01 更新：簡化點數計算
  // 文字訊息永遠免費，只有語音需要 8 點
  const getPointCost = useCallback((): number => {
    if (state.sendMode === 'voice') {
      return 8;
    }
    return 0; // 文字訊息（template, text, ai）全部免費
  }, [state.sendMode]);

  const getFinalMessage = useCallback((): string => {
    if (state.useAiVersion && state.aiSuggestion) {
      return state.aiSuggestion;
    }
    if (state.customText) {
      return state.customText;
    }
    return state.generatedMessage;
  }, [state.useAiVersion, state.aiSuggestion, state.customText, state.generatedMessage]);

  // Content filter check (for real-time feedback)
  const checkContentFilter = useCallback((text: string) => {
    // Only check if text is 5+ characters
    if (text.trim().length < 5) {
      setState((prev) => ({
        ...prev,
        contentWarning: null,
        contentFilterResult: null,
      }));
      return;
    }

    const result = filterContent(text);
    setState((prev) => ({
      ...prev,
      contentFilterResult: result,
      contentWarning: result.isValid ? null : result.violations[0]?.message || null,
    }));
  }, []);

  // Validate content (for submission)
  const validateContent = useCallback((text: string): { isValid: boolean; message: string | null } => {
    if (!text.trim()) {
      return { isValid: true, message: null };
    }

    const result = filterContent(text);
    return {
      isValid: result.isValid,
      message: result.isValid ? null : result.violations[0]?.message || '內容包含不當資訊',
    };
  }, []);

  // AI content moderation (for more accurate, context-aware filtering)
  const checkAiModeration = useCallback(async (text: string) => {
    // Only check if text is 5+ characters
    if (text.trim().length < 5) {
      setState((prev) => ({
        ...prev,
        aiModeration: null,
        isAiModerating: false,
      }));
      return;
    }

    // 先用本地過濾器快速檢查（離線、即時）
    const localFilterResult = filterContent(text);
    if (!localFilterResult.isValid) {
      console.log('[Local Filter] Caught violation:', localFilterResult.violations[0]);
      const violation = localFilterResult.violations[0];
      setState((prev) => ({
        ...prev,
        aiModeration: {
          isAppropriate: false,
          reason: violation?.message || '內容包含不當用語',
          category: 'emotional',
          suggestion: '建議使用 AI 優化功能改善訊息內容',
        },
        isAiModerating: false,
        contentWarning: violation?.message || '內容包含不當用語',
      }));
      return;
    }

    // 再用同步的詞庫檢查（從後端同步的最新詞庫）
    const syncedResult = checkProfanityFromSync(text);
    if (syncedResult.hasIssue) {
      console.log('[Synced Filter] Caught violation:', syncedResult.matchedWord);
      setState((prev) => ({
        ...prev,
        aiModeration: {
          isAppropriate: false,
          reason: `內容包含不當用語：${syncedResult.matchedWord}`,
          category: 'emotional',
          suggestion: '建議使用 AI 優化功能改善訊息內容',
        },
        isAiModerating: false,
        contentWarning: '內容包含不當用語',
      }));
      return;
    }

    console.log('[AI Moderation] Starting check for:', text);
    setState((prev) => ({ ...prev, isAiModerating: true }));

    try {
      const result = await aiApi.moderate(text);
      console.log('[AI Moderation] Result:', result);
      setState((prev) => ({
        ...prev,
        aiModeration: result,
        isAiModerating: false,
        // Update content warning based on AI moderation result
        contentWarning: result.isAppropriate
          ? null
          : result.reason || '內容不適合發送',
      }));
    } catch (error: any) {
      console.error('[AI Moderation] Error:', error?.message || error);
      // On error, fallback to allowing the content (don't block users)
      setState((prev) => ({
        ...prev,
        aiModeration: { isAppropriate: true, reason: null, category: 'ok', suggestion: null },
        isAiModerating: false,
      }));
    }
  }, []);

  // 審核語音轉文字內容
  const checkVoiceModeration = useCallback(async (transcript: string) => {
    if (transcript.trim().length < 5) {
      setState((prev) => ({ ...prev, voiceModeration: null }));
      return;
    }

    // 先用本地過濾器快速檢查
    const localFilterResult = filterContent(transcript);
    if (!localFilterResult.isValid) {
      console.log('[Voice Local Filter] Caught violation:', localFilterResult.violations[0]);
      const violation = localFilterResult.violations[0];
      setState((prev) => ({
        ...prev,
        voiceModeration: {
          isAppropriate: false,
          reason: violation?.message || '語音內容包含不當用語',
          category: 'emotional',
          suggestion: '建議使用 AI 優化功能改善訊息內容',
        },
      }));
      return;
    }

    // 再用同步的詞庫檢查
    const syncedResult = checkProfanityFromSync(transcript);
    if (syncedResult.hasIssue) {
      console.log('[Voice Synced Filter] Caught violation:', syncedResult.matchedWord);
      setState((prev) => ({
        ...prev,
        voiceModeration: {
          isAppropriate: false,
          reason: `語音內容包含不當用語：${syncedResult.matchedWord}`,
          category: 'emotional',
          suggestion: '建議使用 AI 優化功能改善訊息內容',
        },
      }));
      return;
    }

    try {
      const result = await aiApi.moderate(transcript);
      console.log('[Voice Moderation] Result:', result);
      setState((prev) => ({ ...prev, voiceModeration: result }));
    } catch (error: any) {
      console.error('[Voice Moderation] Error:', error?.message || error);
      setState((prev) => ({
        ...prev,
        voiceModeration: { isAppropriate: true, reason: null, category: 'ok', suggestion: null },
      }));
    }
  }, []);

  // 審核用戶編輯的文字內容
  const checkTextModeration = useCallback(async (text: string) => {
    if (text.trim().length < 5) {
      setState((prev) => ({
        ...prev,
        textModeration: null,
        isAiModerating: false,
      }));
      return;
    }

    // 先用本地過濾器快速檢查
    const localFilterResult = filterContent(text);
    if (!localFilterResult.isValid) {
      console.log('[Text Local Filter] Caught violation:', localFilterResult.violations[0]);
      const violation = localFilterResult.violations[0];
      const moderationResult = {
        isAppropriate: false,
        reason: violation?.message || '文字內容包含不當用語',
        category: 'emotional' as const,
        suggestion: '建議使用 AI 優化功能改善訊息內容',
      };
      setState((prev) => ({
        ...prev,
        textModeration: moderationResult,
        aiModeration: moderationResult,
        isAiModerating: false,
      }));
      return;
    }

    // 再用同步的詞庫檢查
    const syncedResult = checkProfanityFromSync(text);
    if (syncedResult.hasIssue) {
      console.log('[Text Synced Filter] Caught violation:', syncedResult.matchedWord);
      const moderationResult = {
        isAppropriate: false,
        reason: `文字內容包含不當用語：${syncedResult.matchedWord}`,
        category: 'emotional' as const,
        suggestion: '建議使用 AI 優化功能改善訊息內容',
      };
      setState((prev) => ({
        ...prev,
        textModeration: moderationResult,
        aiModeration: moderationResult,
        isAiModerating: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isAiModerating: true }));

    try {
      const result = await aiApi.moderate(text);
      console.log('[Text Moderation] Result:', result);
      setState((prev) => ({
        ...prev,
        textModeration: result,
        aiModeration: result, // 同步更新 aiModeration 以保持兼容
        isAiModerating: false,
      }));
    } catch (error: any) {
      console.error('[Text Moderation] Error:', error?.message || error);
      setState((prev) => ({
        ...prev,
        textModeration: { isAppropriate: true, reason: null, category: 'ok', suggestion: null },
        aiModeration: { isAppropriate: true, reason: null, category: 'ok', suggestion: null },
        isAiModerating: false,
      }));
    }
  }, []);

  // 取得合併的審核警告訊息
  const getCombinedModerationWarning = useCallback((): {
    hasIssue: boolean;
    voiceIssue: boolean;
    textIssue: boolean;
    message: string | null;
  } => {
    const voiceIssue = state.voiceModeration && !state.voiceModeration.isAppropriate;
    const textIssue = state.textModeration && !state.textModeration.isAppropriate;

    if (!voiceIssue && !textIssue) {
      return { hasIssue: false, voiceIssue: false, textIssue: false, message: null };
    }

    const messages: string[] = [];
    if (voiceIssue) {
      messages.push(`語音內容：${state.voiceModeration?.reason || '可能涉及不當言論'}`);
    }
    if (textIssue) {
      messages.push(`文字內容：${state.textModeration?.reason || '可能涉及不當言論'}`);
    }

    return {
      hasIssue: true,
      voiceIssue: !!voiceIssue,
      textIssue: !!textIssue,
      message: messages.join('\n'),
    };
  }, [state.voiceModeration, state.textModeration]);

  // AI 優化訊息
  const optimizeWithAi = useCallback(async (text: string): Promise<string | null> => {
    if (text.trim().length < 5) {
      return null;
    }

    try {
      const result = await aiApi.rewrite(
        text,
        state.vehicleType || 'car',
        state.selectedCategory || '車況提醒',
      );

      if (result.rewritten) {
        setState((prev) => ({
          ...prev,
          aiSuggestion: result.rewritten,
          usedAi: true,
        }));
        return result.rewritten;
      }
      return null;
    } catch (error: any) {
      console.error('[AI Optimize] Error:', error?.message || error);
      return null;
    }
  }, [state.vehicleType, state.selectedCategory]);

  // Check if we're in voice mode
  const isVoiceMode = useCallback((): boolean => {
    return state.sendMode === 'voice' && state.voiceRecording !== null;
  }, [state.sendMode, state.voiceRecording]);

  const value: SendContextType = {
    ...state,
    setVehicleType,
    setTargetPlate,
    setPlateInput,
    setSelectedCategory,
    setSelectedSituation,
    setGeneratedMessage,
    setCustomText,
    setAiSuggestion,
    setUseAiVersion,
    setUsedAi,
    setAiLimit,
    setLocation,
    setOccurredAt,
    setSelectedTimeOption,
    setIsLoading,
    setVoiceRecording,
    setVoiceUrl,
    setSendMode,
    setVoiceMemo,
    resetSend,
    clearVoice,
    checkAiLimit,
    getMessageType,
    getPointCost,
    getFinalMessage,
    checkContentFilter,
    checkAiModeration,
    checkVoiceModeration,
    checkTextModeration,
    getCombinedModerationWarning,
    validateContent,
    isVoiceMode,
    optimizeWithAi,
  };

  return <SendContext.Provider value={value}>{children}</SendContext.Provider>;
}

export function useSend() {
  const context = useContext(SendContext);
  if (!context) {
    throw new Error('useSend must be used within a SendProvider');
  }
  return context;
}
