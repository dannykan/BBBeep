/**
 * Confirm Screen
 * 確認並發送
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useAuth } from '../../context/AuthContext';
import { SendLayout, StepHeader } from './components';
import { messagesApi, normalizeLicensePlate, displayLicensePlate, getTotalPoints } from '@bbbeeep/shared';
import { aiApi } from '@bbbeeep/shared';
import { colors, typography, spacing, borderRadius } from '../../theme';

type Props = NativeStackScreenProps<SendStackParamList, 'Confirm'>;

export default function ConfirmScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const {
    targetPlate,
    selectedCategory,
    selectedSituation,
    generatedMessage,
    customText,
    aiSuggestion,
    useAiVersion,
    usedAi,
    location,
    setLocation,
    occurredAt,
    selectedTimeOption,
    setSelectedTimeOption,
    setOccurredAt,
    setAiLimit,
    isLoading,
    setIsLoading,
    getPointCost,
    getFinalMessage,
    validateContent,
  } = useSend();

  const pointCost = getPointCost();
  const finalMessage = getFinalMessage();
  const canAfford = getTotalPoints(user) >= pointCost;

  const handleTimeOptionSelect = (option: 'now' | '5min' | '10min' | '15min') => {
    setSelectedTimeOption(option);
    const now = new Date();
    switch (option) {
      case 'now':
        setOccurredAt(now);
        break;
      case '5min':
        setOccurredAt(new Date(now.getTime() - 5 * 60 * 1000));
        break;
      case '10min':
        setOccurredAt(new Date(now.getTime() - 10 * 60 * 1000));
        break;
      case '15min':
        setOccurredAt(new Date(now.getTime() - 15 * 60 * 1000));
        break;
    }
  };

  const handleConfirm = async () => {
    if (!canAfford) {
      Alert.alert('點數不足', '請先儲值', [
        { text: '取消', style: 'cancel' },
        { text: '去儲值', onPress: () => navigation.getParent()?.navigate('Wallet') },
      ]);
      return;
    }

    if (!selectedCategory || !targetPlate) {
      Alert.alert('錯誤', '請完成所有步驟');
      return;
    }

    if (!location.trim()) {
      Alert.alert('錯誤', '請填寫事發地點');
      return;
    }

    const isOtherCase =
      selectedCategory === '其他情況' ||
      (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise');

    if (!isOtherCase && !generatedMessage) {
      Alert.alert('錯誤', '請完成所有步驟');
      return;
    }

    if (isOtherCase && (!customText.trim() || customText.trim().length < 5)) {
      Alert.alert('錯誤', '說明內容至少需要 5 個字');
      return;
    }

    // Content filter validation (final check)
    if (customText.trim()) {
      const validation = validateContent(customText);
      if (!validation.isValid) {
        Alert.alert('內容不當', validation.message || '請修改內容後再試');
        return;
      }
    }

    setIsLoading(true);
    try {
      const normalizedPlate = normalizeLicensePlate(targetPlate);
      if (!normalizedPlate) {
        Alert.alert('錯誤', '車牌號碼格式無效');
        setIsLoading(false);
        return;
      }

      await messagesApi.create({
        licensePlate: normalizedPlate,
        type:
          selectedCategory === '其他情況'
            ? '行車安全提醒'
            : selectedCategory === '行車安全'
            ? '行車安全提醒'
            : (selectedCategory as any),
        template: isOtherCase ? customText : generatedMessage || customText,
        customText: isOtherCase ? undefined : customText || undefined,
        useAiRewrite: usedAi,
        location: location || undefined,
        occurredAt: occurredAt.toISOString(),
      });

      try {
        const resetResult = await aiApi.resetLimit();
        setAiLimit(resetResult);
      } catch (error) {
        console.error('Failed to reset AI limit:', error);
      }

      await refreshUser();
      navigation.navigate('Success');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '發送失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const timeOptions = [
    { id: 'now', label: '剛剛' },
    { id: '5min', label: '5 分鐘前' },
    { id: '10min', label: '10 分鐘前' },
    { id: '15min', label: '15 分鐘前' },
  ] as const;

  return (
    <SendLayout currentStep={5} totalSteps={5}>
      <StepHeader title="確認並發送" subtitle="請確認以下資訊" />

      {/* Target plate */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>對象車牌</Text>
        <Text style={styles.infoValue}>{displayLicensePlate(targetPlate)}</Text>
      </View>

      {/* Message preview */}
      <View style={styles.messageCard}>
        <Text style={styles.messageLabel}>提醒內容</Text>
        <Text style={styles.messageText}>{finalMessage}</Text>
      </View>

      {/* Location input */}
      <View style={styles.inputSection}>
        <View style={styles.inputLabelRow}>
          <Ionicons name="location-outline" size={16} color={colors.muted.foreground} />
          <Text style={styles.inputLabel}>事發地點</Text>
        </View>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="例如：中正路與民生路口"
          placeholderTextColor={colors.muted.foreground}
        />
      </View>

      {/* Time selection */}
      <View style={styles.inputSection}>
        <View style={styles.inputLabelRow}>
          <Ionicons name="time-outline" size={16} color={colors.muted.foreground} />
          <Text style={styles.inputLabel}>發生時間</Text>
        </View>
        <View style={styles.timeOptions}>
          {timeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.timeOption,
                selectedTimeOption === option.id && styles.timeOptionSelected,
              ]}
              onPress={() => handleTimeOptionSelect(option.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeOptionText,
                  selectedTimeOption === option.id && styles.timeOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Point cost warning */}
      {!canAfford && (
        <View style={styles.warningCard}>
          <Ionicons name="alert-circle" size={16} color={colors.destructive.DEFAULT} />
          <Text style={styles.warningText}>點數不足，請先儲值</Text>
        </View>
      )}

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.primaryButton, (isLoading || !canAfford || !location.trim()) && styles.buttonDisabled]}
        onPress={handleConfirm}
        disabled={isLoading || !canAfford || !location.trim()}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary.foreground} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>確認發送</Text>
            <View style={styles.pointBadge}>
              <Text style={styles.pointBadgeText}>{pointCost} 點</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    marginBottom: spacing[1],
  },
  infoValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.foreground,
  },
  messageCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  messageLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    marginBottom: spacing[2],
  },
  messageText: {
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  inputSection: {
    marginBottom: spacing[4],
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  input: {
    backgroundColor: colors.card.DEFAULT,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  timeOption: {
    backgroundColor: colors.card.DEFAULT,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  timeOptionSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  timeOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  timeOptionTextSelected: {
    color: colors.primary.foreground,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: `${colors.destructive.DEFAULT}10`,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.destructive.DEFAULT,
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
  buttonDisabled: {
    opacity: 0.5,
  },
});
