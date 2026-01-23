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
import { SendLayout, StepHeader } from './components';
import { aiApi } from '@bbbeeep/shared';
import { colors, typography, spacing, borderRadius } from '../../theme';

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
        <View style={styles.generatedCard}>
          <Text style={styles.generatedLabel}>系統生成</Text>
          <Text style={styles.generatedText}>{generatedMessage}</Text>
        </View>
      )}

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>
          {isOtherCase ? '說明內容' : '補充說明'}
        </Text>
        <TextInput
          style={styles.textArea}
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
        <Text style={[styles.charCount, trimmedLength > 0 && !isValidLength && styles.charCountError]}>
          {trimmedLength} / {MAX_CHARS}（最少 {MIN_CHARS} 字）
        </Text>
      </View>

      {/* 內容過濾警告 */}
      {contentWarning && trimmedLength >= MIN_CHARS && (
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={16} color="#D97706" />
          <View style={styles.warningContent}>
            <Text style={styles.warningText}>{contentWarning}</Text>
            <Text style={styles.warningHint}>送出時將無法通過驗證</Text>
          </View>
        </View>
      )}

      {/* 送出選項 - 有輸入文字時顯示 */}
      {customText.trim().length > 0 && (
        <View style={styles.submitOptions}>
          {/* AI 優化選項 */}
          {aiLimit.canUse && (
            <TouchableOpacity
              style={[styles.submitOption, styles.aiOption, (isLoading || !isValidLength) && styles.buttonDisabled]}
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
                    <Text style={styles.aiOptionText}>AI 優化送出</Text>
                  </View>
                  <View style={styles.pointBadge}>
                    <Text style={styles.pointBadgeText}>2 點</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* 直接送出選項 */}
          <TouchableOpacity
            style={[styles.submitOption, styles.directOption, (isLoading || !isValidLength) && styles.buttonDisabled]}
            onPress={handleDirectSubmit}
            disabled={isLoading || !isValidLength}
            activeOpacity={0.8}
          >
            <View style={styles.optionMain}>
              <Text style={styles.directOptionText}>直接送出</Text>
            </View>
            <View style={[styles.pointBadge, styles.pointBadgeDirect]}>
              <Text style={[styles.pointBadgeText, styles.pointBadgeTextDirect]}>4 點</Text>
            </View>
          </TouchableOpacity>

          {aiLimit.canUse && (
            <Text style={styles.aiHint}>
              <Ionicons name="information-circle-outline" size={14} color={colors.muted.foreground} />
              {' '}AI 會幫你優化文字，讓提醒更專業友善
            </Text>
          )}
        </View>
      )}

      {/* 沒有輸入時顯示跳過按鈕（僅非必填情況） */}
      {!isOtherCase && customText.trim().length === 0 && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleDirectSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>跳過，直接送出</Text>
        </TouchableOpacity>
      )}
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  generatedCard: {
    backgroundColor: colors.muted.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  generatedLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    marginBottom: spacing[1],
  },
  generatedText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  inputSection: {
    marginBottom: spacing[4],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  textArea: {
    backgroundColor: colors.card.DEFAULT,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    minHeight: 120,
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    textAlign: 'right',
    marginTop: spacing[1],
  },
  charCountError: {
    color: colors.destructive.DEFAULT,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', // amber-100
    borderWidth: 1,
    borderColor: '#F59E0B', // amber-500
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
    color: '#B45309', // amber-700
  },
  warningHint: {
    fontSize: typography.fontSize.xs,
    color: '#D97706', // amber-600
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
    backgroundColor: colors.primary.DEFAULT,
  },
  directOption: {
    backgroundColor: colors.card.DEFAULT,
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },
  optionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  aiOptionText: {
    color: colors.primary.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  directOptionText: {
    color: colors.foreground,
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
    backgroundColor: colors.muted.DEFAULT,
  },
  pointBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.primary.foreground,
  },
  pointBadgeTextDirect: {
    color: colors.muted.foreground,
  },
  aiHint: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  skipButton: {
    backgroundColor: colors.muted.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
  },
  skipButtonText: {
    color: colors.muted.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
