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
import { SendLayout, StepHeader } from './components';
import { colors, typography, spacing, borderRadius } from '../../theme';

type Props = NativeStackScreenProps<SendStackParamList, 'Review'>;

export default function ReviewScreen({ navigation }: Props) {
  const { generatedMessage, aiLimit } = useSend();

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
      <View style={styles.messageCard}>
        <Text style={styles.messageText}>{generatedMessage}</Text>
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="sparkles" size={20} color={colors.muted.foreground} />
          <Text style={styles.infoText}>
            {aiLimit.canUse
              ? '可以補充說明，AI 會幫你優化文字'
              : 'AI 額度已用完，今天無法使用 AI 優化'}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleDirectSend}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>直接送出</Text>
          <View style={styles.pointBadge}>
            <Text style={styles.pointBadgeText}>2 點</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleAddText}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>補充說明</Text>
        </TouchableOpacity>
      </View>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  messageCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  messageText: {
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  infoCard: {
    backgroundColor: colors.muted.DEFAULT,
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
    color: colors.muted.foreground,
  },
  buttonGroup: {
    gap: spacing[3],
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  primaryButtonText: {
    color: colors.primary.foreground,
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
    color: colors.primary.foreground,
  },
  secondaryButton: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
});
