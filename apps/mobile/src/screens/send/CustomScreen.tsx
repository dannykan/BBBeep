/**
 * Custom Screen
 * 自訂補充說明
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, StepHeader } from './components';
import { aiApi } from '@bbbeeep/shared';
import { typography, spacing, borderRadius } from '../../theme';

const MIN_CHARS = 5;
const MAX_CHARS = 30;

type Props = NativeStackScreenProps<SendStackParamList, 'Custom'>;

export default function CustomScreen({ navigation }: Props) {
  const {
    vehicleType,
    selectedCategory,
    selectedSituation,
    generatedMessage,
    customText,
    setCustomText,
    setAiSuggestion,
    setUsedAi,
    setUseAiVersion,
    aiLimit,
    checkAiLimit,
    isLoading,
    setIsLoading,
    contentWarning,
    checkContentFilter,
    validateContent,
  } = useSend();
  const { colors, isDark } = useTheme();

  // Debounced content filter check
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      checkContentFilter(customText);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [customText, checkContentFilter]);

  const isOtherCase =
    selectedCategory === '其他情況' ||
    (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise');

  const trimmedLength = customText.trim().length;
  const isValidLength = trimmedLength >= MIN_CHARS && trimmedLength <= MAX_CHARS;
  const canSubmit = isOtherCase ? isValidLength : true;

  // 直接送出（扣 4 點）
  const handleDirectSubmit = () => {
    if (isOtherCase && !isValidLength) {
      Alert.alert('錯誤', `說明內容需要 ${MIN_CHARS}-${MAX_CHARS} 個字`);
      return;
    }
    if (!isOtherCase && customText.trim() && !isValidLength) {
      Alert.alert('錯誤', `補充文字需要 ${MIN_CHARS}-${MAX_CHARS} 個字`);
      return;
    }
    // Content filter validation
    const validation = validateContent(customText);
    if (!validation.isValid) {
      Alert.alert('內容不當', validation.message || '請修改內容後再試');
      return;
    }
    setUseAiVersion(false);
    setUsedAi(false);
    navigation.navigate('Confirm');
  };

  // AI 優化送出（扣 2 點）
  const handleAiSubmit = async () => {
    if (!isValidLength) {
      Alert.alert('錯誤', `${isOtherCase ? '說明內容' : '補充文字'}需要 ${MIN_CHARS}-${MAX_CHARS} 個字`);
      return;
    }
    // Content filter validation
    const validation = validateContent(customText);
    if (!validation.isValid) {
      Alert.alert('內容不當', validation.message || '請修改內容後再試');
      return;
    }

    setIsLoading(true);
    try {
      const textToRewrite = isOtherCase
        ? customText
        : `${generatedMessage} ${customText}`;
      const result = await aiApi.rewrite(
        textToRewrite,
        vehicleType || undefined,
        selectedCategory || undefined
      );
      setAiSuggestion(result.rewritten);
      setUsedAi(true);
      await checkAiLimit();
      navigation.navigate('AiSuggest');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || 'AI 改寫失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // Warning colors for dark mode
  const warningBgColor = isDark ? '#78350F' : '#FEF3C7';
  const warningBorderColor = isDark ? '#D97706' : '#F59E0B';
  const warningTextColor = isDark ? '#FCD34D' : '#B45309';
  const warningHintColor = isDark ? '#FBBF24' : '#D97706';

  return (
    <SendLayout currentStep={4} totalSteps={5}>
      <StepHeader
        title={isOtherCase ? '請說明情況' : '補充說明'}
        subtitle={
          isOtherCase
            ? '請詳細描述你想提醒的事項'
            : '補充更多資訊，讓提醒更清楚'
        }
      />

      {!isOtherCase && generatedMessage && (
        <View style={[styles.generatedCard, { backgroundColor: colors.muted.DEFAULT }]}>
          <Text style={[styles.generatedLabel, { color: colors.muted.foreground }]}>系統生成</Text>
          <Text style={[styles.generatedText, { color: colors.foreground }]}>{generatedMessage}</Text>
        </View>
      )}

      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>
          {isOtherCase ? '說明內容' : '補充說明'}
        </Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid, color: colors.foreground }]}
          value={customText}
          onChangeText={setCustomText}
          placeholder={
            isOtherCase
              ? `請描述你想提醒的情況（${MIN_CHARS}-${MAX_CHARS} 字）`
              : `例如：車牌貼紙快掉了（${MIN_CHARS}-${MAX_CHARS} 字）`
          }
          placeholderTextColor={colors.muted.foreground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={MAX_CHARS}
        />
        <Text style={[styles.charCount, { color: colors.muted.foreground }, trimmedLength > 0 && !isValidLength && { color: colors.destructive.DEFAULT }]}>
          {trimmedLength} / {MAX_CHARS}（最少 {MIN_CHARS} 字）
        </Text>
      </View>

      {/* 內容過濾警告 */}
      {contentWarning && trimmedLength >= MIN_CHARS && (
        <View style={[styles.warningCard, { backgroundColor: warningBgColor, borderColor: warningBorderColor }]}>
          <Ionicons name="warning" size={16} color="#D97706" />
          <View style={styles.warningContent}>
            <Text style={[styles.warningText, { color: warningTextColor }]}>{contentWarning}</Text>
            <Text style={[styles.warningHint, { color: warningHintColor }]}>送出時將無法通過驗證</Text>
          </View>
        </View>
      )}

      {/* 送出選項 - 有輸入文字時顯示 */}
      {customText.trim().length > 0 && (
        <View style={styles.submitOptions}>
          {/* AI 優化選項 */}
          {aiLimit.canUse && (
            <TouchableOpacity
              style={[styles.submitOption, styles.aiOption, { backgroundColor: colors.primary.DEFAULT }, (isLoading || !isValidLength) && styles.buttonDisabled]}
              onPress={handleAiSubmit}
              disabled={isLoading || !isValidLength}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primary.foreground} />
              ) : (
                <>
                  <View style={styles.optionMain}>
                    <Ionicons name="sparkles" size={20} color={colors.primary.foreground} />
                    <Text style={[styles.aiOptionText, { color: colors.primary.foreground }]}>AI 優化送出</Text>
                  </View>
                  <View style={styles.pointBadge}>
                    <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>2 點</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* 直接送出選項 */}
          <TouchableOpacity
            style={[styles.submitOption, styles.directOption, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }, (isLoading || !isValidLength) && styles.buttonDisabled]}
            onPress={handleDirectSubmit}
            disabled={isLoading || !isValidLength}
            activeOpacity={0.8}
          >
            <View style={styles.optionMain}>
              <Text style={[styles.directOptionText, { color: colors.foreground }]}>直接送出</Text>
            </View>
            <View style={[styles.pointBadge, styles.pointBadgeDirect, { backgroundColor: colors.muted.DEFAULT }]}>
              <Text style={[styles.pointBadgeText, styles.pointBadgeTextDirect, { color: colors.muted.foreground }]}>4 點</Text>
            </View>
          </TouchableOpacity>

          {aiLimit.canUse && (
            <Text style={[styles.aiHint, { color: colors.muted.foreground }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.muted.foreground} />
              {' '}AI 會幫你優化文字，讓提醒更專業友善
            </Text>
          )}
        </View>
      )}

      {/* 沒有輸入時顯示跳過按鈕（僅非必填情況） */}
      {!isOtherCase && customText.trim().length === 0 && (
        <TouchableOpacity
          style={[styles.skipButton, { backgroundColor: colors.muted.DEFAULT }]}
          onPress={handleDirectSubmit}
          activeOpacity={0.8}
        >
          <Text style={[styles.skipButtonText, { color: colors.muted.foreground }]}>跳過，直接送出</Text>
        </TouchableOpacity>
      )}
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  generatedCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  generatedLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[1],
  },
  generatedText: {
    fontSize: typography.fontSize.sm,
  },
  inputSection: {
    marginBottom: spacing[4],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    marginBottom: spacing[2],
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    minHeight: 120,
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    textAlign: 'right',
    marginTop: spacing[1],
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  warningContent: {
    flex: 1,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  warningHint: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing[0.5],
  },
  submitOptions: {
    gap: spacing[3],
  },
  submitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  aiOption: {
  },
  directOption: {
    borderWidth: 1,
  },
  optionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  aiOptionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  directOptionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  pointBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  pointBadgeDirect: {
  },
  pointBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
  },
  pointBadgeTextDirect: {
  },
  aiHint: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  skipButton: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
