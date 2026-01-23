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
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, StepHeader } from './components';
import { messagesApi, normalizeLicensePlate, displayLicensePlate, getTotalPoints } from '@bbbeeep/shared';
import { aiApi } from '@bbbeeep/shared';
import { typography, spacing, borderRadius } from '../../theme';

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
  const { colors, isDark } = useTheme();

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

  // Warning colors for dark mode
  const warningBgColor = isDark ? `${colors.destructive.DEFAULT}30` : `${colors.destructive.DEFAULT}10`;

  return (
    <SendLayout currentStep={5} totalSteps={5}>
      <StepHeader title="確認並發送" subtitle="請確認以下資訊" />

      {/* Target plate */}
      <View style={[styles.infoCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}>
        <Text style={[styles.infoLabel, { color: colors.muted.foreground }]}>對象車牌</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{displayLicensePlate(targetPlate)}</Text>
      </View>

      {/* Message preview */}
      <View style={[styles.messageCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}>
        <Text style={[styles.messageLabel, { color: colors.muted.foreground }]}>提醒內容</Text>
        <Text style={[styles.messageText, { color: colors.foreground }]}>{finalMessage}</Text>
      </View>

      {/* Location input */}
      <View style={styles.inputSection}>
        <View style={styles.inputLabelRow}>
          <Ionicons name="location-outline" size={16} color={colors.muted.foreground} />
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>事發地點</Text>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid, color: colors.foreground }]}
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
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>發生時間</Text>
        </View>
        <View style={styles.timeOptions}>
          {timeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.timeOption,
                { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid },
                selectedTimeOption === option.id && { backgroundColor: colors.primary.DEFAULT, borderColor: colors.primary.DEFAULT },
              ]}
              onPress={() => handleTimeOptionSelect(option.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeOptionText,
                  { color: colors.foreground },
                  selectedTimeOption === option.id && { color: colors.primary.foreground },
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
        <View style={[styles.warningCard, { backgroundColor: warningBgColor }]}>
          <Ionicons name="alert-circle" size={16} color={colors.destructive.DEFAULT} />
          <Text style={[styles.warningText, { color: colors.destructive.DEFAULT }]}>點數不足，請先儲值</Text>
        </View>
      )}

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary.DEFAULT }, (isLoading || !canAfford || !location.trim()) && styles.buttonDisabled]}
        onPress={handleConfirm}
        disabled={isLoading || !canAfford || !location.trim()}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary.foreground} />
        ) : (
          <>
            <Text style={[styles.primaryButtonText, { color: colors.primary.foreground }]}>確認發送</Text>
            <View style={styles.pointBadge}>
              <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>{pointCost} 點</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[1],
  },
  infoValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
  },
  messageCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  messageLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[2],
  },
  messageText: {
    fontSize: typography.fontSize.base,
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
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  timeOption: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  timeOptionText: {
    fontSize: typography.fontSize.sm,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  warningText: {
    fontSize: typography.fontSize.sm,
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
  buttonDisabled: {
    opacity: 0.5,
  },
});
