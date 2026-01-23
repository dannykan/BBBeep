/**
 * Send Context
 * 用於在發送提醒各步驟之間共享狀態
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { aiApi, filterContent, type ContentFilterResult, type AiModerationResponse } from '@bbbeeep/shared';
import type { VehicleType, MessageType } from '@bbbeeep/shared';

type ReminderCategory = '車況提醒' | '行車安全' | '讚美感謝' | '其他情況';
type SendMode = 'text' | 'voice' | 'ai';

interface VoiceRecording {
  uri: string;
  duration: number;
  transcript: string;
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
  occurredAt: Date;
  selectedTimeOption: 'now' | '5min' | '10min' | '15min';

  // Loading
  isLoading: boolean;

  // Content filter
  contentWarning: string | null;
  contentFilterResult: ContentFilterResult | null;

  // AI Moderation
  aiModeration: AiModerationResponse | null;
  isAiModerating: boolean;

  // Voice
  voiceRecording: VoiceRecording | null;
  voiceUrl: string | null;
  sendMode: SendMode;
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
  setLocation: (location: string) => void;
  setOccurredAt: (date: Date) => void;
  setSelectedTimeOption: (option: 'now' | '5min' | '10min' | '15min') => void;
  setIsLoading: (loading: boolean) => void;

  // Voice setters
  setVoiceRecording: (recording: VoiceRecording | null) => void;
  setVoiceUrl: (url: string | null) => void;
  setSendMode: (mode: SendMode) => void;

  // Helpers
  resetSend: () => void;
  clearVoice: () => void;
  checkAiLimit: () => Promise<void>;
  getMessageType: () => MessageType;
  getPointCost: () => number;
  getFinalMessage: () => string;
  checkContentFilter: (text: string) => void;
  checkAiModeration: (text: string) => Promise<void>;
  validateContent: (text: string) => { isValid: boolean; message: string | null };
  isVoiceMode: () => boolean;
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
  occurredAt: new Date(),
  selectedTimeOption: 'now',
  isLoading: false,
  contentWarning: null,
  contentFilterResult: null,
  // AI Moderation
  aiModeration: null,
  isAiModerating: false,
  // Voice
  voiceRecording: null,
  voiceUrl: null,
  sendMode: 'text',
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

  const setLocation = useCallback((location: string) => {
    setState((prev) => ({ ...prev, location: location }));
  }, []);

  const setOccurredAt = useCallback((date: Date) => {
    setState((prev) => ({ ...prev, occurredAt: date }));
  }, []);

  const setSelectedTimeOption = useCallback((option: 'now' | '5min' | '10min' | '15min') => {
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

  const getPointCost = useCallback((): number => {
    // Voice mode: 6 points for voice
    if (state.sendMode === 'voice') {
      return 6;
    }

    // If we have a voice recording but sending as text (from transcript)
    if (state.voiceRecording && state.sendMode === 'text') {
      // Text from voice transcript: same as custom text without AI
      return 4;
    }

    // If we have a voice recording and using AI optimization
    if (state.voiceRecording && state.sendMode === 'ai') {
      return 2;
    }

    // AI 優化版本扣 2 點
    if (state.useAiVersion && state.aiSuggestion) {
      return 2;
    }

    // 讚美感謝（純模板）：免費
    if (state.selectedCategory === '讚美感謝' && !state.customText.trim()) {
      return 0;
    }

    // 有自訂文字但沒用 AI：4 點
    if (state.customText.trim()) {
      return 4;
    }

    // 純系統模板（非讚美）：1 點
    return 1;
  }, [state.useAiVersion, state.aiSuggestion, state.selectedCategory, state.customText, state.sendMode, state.voiceRecording]);

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
    resetSend,
    clearVoice,
    checkAiLimit,
    getMessageType,
    getPointCost,
    getFinalMessage,
    checkContentFilter,
    checkAiModeration,
    validateContent,
    isVoiceMode,
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
