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
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, StepHeader } from './components';
import { typography, spacing, borderRadius } from '../../theme';

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
  const { colors } = useTheme();

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
      <View style={[styles.optionCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
        <View style={styles.optionHeader}>
          <View style={[styles.optionBadge, { backgroundColor: `${colors.primary.DEFAULT}20` }]}>
            <Ionicons name="sparkles" size={14} color={colors.primary.DEFAULT} />
            <Text style={[styles.optionBadgeText, { color: colors.primary.DEFAULT }]}>AI 優化版</Text>
          </View>
        </View>
        <Text style={[styles.optionText, { color: colors.foreground }]}>{aiSuggestion}</Text>
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: colors.primary.DEFAULT }]}
          onPress={handleUseAi}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="sparkles" size={20} color={colors.primary.foreground} />
            <Text style={[styles.aiButtonText, { color: colors.primary.foreground }]}>使用 AI 版本</Text>
          </View>
          <View style={styles.pointBadgeAi}>
            <Text style={[styles.pointBadgeAiText, { color: colors.primary.foreground }]}>2 點</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Original text card */}
      <View style={[styles.optionCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
        <View style={styles.optionHeader}>
          <Text style={[styles.optionLabel, { color: colors.foreground }]}>原始版本</Text>
        </View>
        <Text style={[styles.optionText, { color: colors.foreground }]}>{originalText}</Text>
        <TouchableOpacity
          style={[styles.originalButton, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}
          onPress={handleUseOriginal}
          activeOpacity={0.8}
        >
          <Text style={[styles.originalButtonText, { color: colors.foreground }]}>使用原始版本</Text>
          <View style={[styles.pointBadgeOriginal, { backgroundColor: colors.muted.DEFAULT }]}>
            <Text style={[styles.pointBadgeOriginalText, { color: colors.muted.foreground }]}>4 點</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
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
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  optionBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
  optionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  optionText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  originalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  originalButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  pointBadgeOriginal: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  pointBadgeOriginalText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
  },
});
