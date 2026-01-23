/**
 * AI Suggest Screen
 * AI 優化後的訊息選擇
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { SendLayout, StepHeader } from './components';
import { colors, typography, spacing, borderRadius } from '../../theme';

type Props = NativeStackScreenProps<SendStackParamList, 'AiSuggest'>;

export default function AiSuggestScreen({ navigation }: Props) {
  const {
    selectedCategory,
    selectedSituation,
    generatedMessage,
    customText,
    aiSuggestion,
    useAiVersion,
    setUseAiVersion,
  } = useSend();

  const isOtherCase =
    selectedCategory === '其他情況' ||
    (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise');

  const originalText = isOtherCase
    ? customText
    : `${generatedMessage} ${customText}`.trim();

  const handleUseAi = () => {
    setUseAiVersion(true);
    navigation.navigate('Confirm');
  };

  const handleUseOriginal = () => {
    setUseAiVersion(false);
    navigation.navigate('Confirm');
  };

  return (
    <SendLayout currentStep={4} totalSteps={5}>
      <StepHeader
        title="AI 優化版本"
        subtitle="選擇你想使用的版本"
      />

      {/* AI suggestion card */}
      <View style={styles.optionCard}>
        <View style={styles.optionHeader}>
          <View style={styles.optionBadge}>
            <Ionicons name="sparkles" size={14} color={colors.primary.DEFAULT} />
            <Text style={styles.optionBadgeText}>AI 優化版</Text>
          </View>
        </View>
        <Text style={styles.optionText}>{aiSuggestion}</Text>
        <TouchableOpacity
          style={styles.aiButton}
          onPress={handleUseAi}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="sparkles" size={20} color={colors.primary.foreground} />
            <Text style={styles.aiButtonText}>使用 AI 版本</Text>
          </View>
          <View style={styles.pointBadgeAi}>
            <Text style={styles.pointBadgeAiText}>2 點</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Original text card */}
      <View style={styles.optionCard}>
        <View style={styles.optionHeader}>
          <Text style={styles.optionLabel}>原始版本</Text>
        </View>
        <Text style={styles.optionText}>{originalText}</Text>
        <TouchableOpacity
          style={styles.originalButton}
          onPress={handleUseOriginal}
          activeOpacity={0.8}
        >
          <Text style={styles.originalButtonText}>使用原始版本</Text>
          <View style={styles.pointBadgeOriginal}>
            <Text style={styles.pointBadgeOriginalText}>4 點</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  optionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: `${colors.primary.DEFAULT}10`,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  optionBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.primary.DEFAULT,
  },
  optionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  optionText: {
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  aiButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.primary.foreground,
  },
  pointBadgeAi: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  pointBadgeAiText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.primary.foreground,
  },
  originalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  originalButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  pointBadgeOriginal: {
    backgroundColor: colors.muted.DEFAULT,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  pointBadgeOriginalText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.muted.foreground,
  },
});
