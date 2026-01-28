/**
 * Review Screen
 * 預覽系統生成的訊息
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

type Props = NativeStackScreenProps<SendStackParamList, 'Review'>;

export default function ReviewScreen({ navigation }: Props) {
  const { generatedMessage, aiLimit, getPointCost } = useSend();
  const { colors } = useTheme();
  const pointCost = getPointCost();

  const handleDirectSend = () => {
    navigation.navigate('Confirm');
  };

  const handleAddText = () => {
    navigation.navigate('Custom');
  };

  return (
    <SendLayout currentStep={4} totalSteps={5}>
      <StepHeader
        title="系統生成的提醒"
        subtitle="這是系統幫你生成的提醒內容"
      />

      {/* Generated message card */}
      <View style={[styles.messageCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
        <Text style={[styles.messageText, { color: colors.foreground }]}>{generatedMessage}</Text>
      </View>

      {/* Info card */}
      <View style={[styles.infoCard, { backgroundColor: colors.muted.DEFAULT }]}>
        <View style={styles.infoRow}>
          <Ionicons name="sparkles" size={20} color={colors.muted.foreground} />
          <Text style={[styles.infoText, { color: colors.muted.foreground }]}>
            {aiLimit.canUse
              ? '可以補充說明，AI 會幫你優化文字'
              : 'AI 額度已用完，今天無法使用 AI 優化'}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary.DEFAULT }]}
          onPress={handleDirectSend}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primary.foreground }]}>直接送出</Text>
          <View style={styles.pointBadge}>
            <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>{pointCost === 0 ? '免費' : `${pointCost} 點`}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}
          onPress={handleAddText}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>補充說明</Text>
        </TouchableOpacity>
      </View>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  messageCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  messageText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  infoCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  buttonGroup: {
    gap: spacing[3],
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  primaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  pointBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  pointBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
  },
  secondaryButton: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
});
