/**
 * Send Context
 * 用於在發送提醒各步驟之間共享狀態
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { aiApi } from '@bbbeeep/shared';
import type { VehicleType, MessageType } from '@bbbeeep/shared';

type ReminderCategory = '車況提醒' | '行車安全' | '讚美感謝' | '其他情況';

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

  // Helpers
  resetSend: () => void;
  checkAiLimit: () => Promise<void>;
  getMessageType: () => MessageType;
  getPointCost: () => number;
  getFinalMessage: () => string;
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
    // AI 優化版本扣 2 點，直接送出扣 4 點
    if (state.useAiVersion && state.aiSuggestion) {
      return 2;
    }
    // 讚美感謝只扣 1 點（沒有自訂文字時）
    if (state.selectedCategory === '讚美感謝' && !state.customText.trim()) {
      return 1;
    }
    // 有自訂文字但沒用 AI：4 點
    if (state.customText.trim()) {
      return 4;
    }
    // 純系統模板：2 點
    return 2;
  }, [state.useAiVersion, state.aiSuggestion, state.selectedCategory, state.customText]);

  const getFinalMessage = useCallback((): string => {
    if (state.useAiVersion && state.aiSuggestion) {
      return state.aiSuggestion;
    }
    if (state.customText) {
      return state.customText;
    }
    return state.generatedMessage;
  }, [state.useAiVersion, state.aiSuggestion, state.customText, state.generatedMessage]);

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
    resetSend,
    checkAiLimit,
    getMessageType,
    getPointCost,
    getFinalMessage,
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
