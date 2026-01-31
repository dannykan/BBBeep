/**
 * Invite Code Screen (Step 5)
 * 邀請碼輸入
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTheme } from '../../context/ThemeContext';
import { OnboardingLayout, OnboardingCard, StepHeader } from './components';
import { inviteApi } from '@bbbeeep/shared';
import { getErrorMessage } from '../../lib/error-utils';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'InviteCode'>;

export default function InviteCodeScreen({ navigation }: Props) {
  const {
    userType,
    inviteCode,
    setInviteCode,
    inviteCodeValidation,
    setInviteCodeValidation,
    setInviteCodeApplied,
    isLoading,
    setIsLoading,
    isValidatingCode,
    setIsValidatingCode,
    getTotalSteps,
  } = useOnboarding();
  const { colors, isDark } = useTheme();

  // Calculate display step (pedestrians skip license plate)
  const currentStep = userType === 'pedestrian' ? 4 : 5;

  const handleValidateInviteCode = useCallback(async (code: string) => {
    if (code.length < 6) {
      setInviteCodeValidation(null);
      return;
    }

    setIsValidatingCode(true);
    try {
      const result = await inviteApi.validateCode(code);
      setInviteCodeValidation(result);
    } catch (error) {
      setInviteCodeValidation({ valid: false, message: '驗證失敗' });
    } finally {
      setIsValidatingCode(false);
    }
  }, [setInviteCodeValidation, setIsValidatingCode]);

  const handleInviteCodeChange = useCallback((text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 8) {
      setInviteCode(cleaned);
      if (cleaned.length >= 6) {
        handleValidateInviteCode(cleaned);
      } else {
        setInviteCodeValidation(null);
      }
    }
  }, [setInviteCode, handleValidateInviteCode, setInviteCodeValidation]);

  const handleApplyInviteCode = useCallback(async () => {
    if (!inviteCodeValidation?.valid || !inviteCode) return;

    setIsLoading(true);
    try {
      await inviteApi.applyCode(inviteCode);
      setInviteCodeApplied(true);
      Alert.alert('成功', '邀請碼已套用！完成註冊後你和邀請人各得 10 點');
      navigation.navigate('Welcome');
    } catch (error: any) {
      Alert.alert('錯誤', getErrorMessage(error, '使用邀請碼失敗'));
    } finally {
      setIsLoading(false);
    }
  }, [inviteCodeValidation, inviteCode, setIsLoading, setInviteCodeApplied, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('Welcome');
  }, [navigation]);

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={getTotalSteps()}>
      <OnboardingCard>
        <StepHeader title="有邀請碼嗎？">
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary.DEFAULT}15` }]}>
            <Ionicons name="gift-outline" size={28} color={colors.primary.DEFAULT} />
          </View>
        </StepHeader>

        <View style={[styles.rewardBadge, { backgroundColor: `${colors.primary.DEFAULT}10` }]}>
          <Text style={[styles.rewardBadgeText, { color: colors.primary.DEFAULT }]}>輸入邀請碼，你我各得 10 點！</Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={[styles.label, { color: colors.foreground }]}>邀請碼</Text>
          <TextInput
            style={[styles.inviteCodeInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card.DEFAULT }]}
            placeholder="輸入邀請碼或車牌"
            placeholderTextColor={colors.muted.foreground}
            value={inviteCode}
            onChangeText={handleInviteCodeChange}
            maxLength={8}
            autoCapitalize="characters"
          />

          {isValidatingCode && (
            <Text style={[styles.validatingText, { color: colors.muted.foreground }]}>驗證中...</Text>
          )}

          {inviteCodeValidation?.valid && (
            <View style={[styles.validCodeCard, { backgroundColor: isDark ? '#052e16' : '#F0FDF4', borderColor: isDark ? '#166534' : '#BBF7D0' }]}>
              <View style={[styles.validCodeIcon, { backgroundColor: isDark ? '#166534' : '#DCFCE7' }]}>
                <Ionicons name="checkmark" size={16} color={isDark ? '#4ade80' : '#16A34A'} />
              </View>
              <View style={styles.validCodeContent}>
                <Text style={[styles.validCodeTitle, { color: isDark ? '#4ade80' : '#166534' }]}>
                  來自「{inviteCodeValidation.inviterNickname}」的邀請
                </Text>
                <Text style={[styles.validCodeSubtitle, { color: isDark ? '#86efac' : '#16A34A' }]}>
                  完成註冊後，你和邀請人各得 10 點
                </Text>
              </View>
            </View>
          )}

          {inviteCodeValidation && !inviteCodeValidation.valid && (
            <Text style={[styles.invalidCodeText, { color: isDark ? '#f87171' : '#DC2626' }]}>
              {inviteCodeValidation.message || '無效的邀請碼'}
            </Text>
          )}
        </View>

        <View style={styles.buttonGroup}>
          {inviteCodeValidation?.valid ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary.DEFAULT }, isLoading && styles.buttonDisabled]}
                onPress={handleApplyInviteCode}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={[styles.primaryButtonText, { color: colors.primary.foreground }]}>
                  {isLoading ? '處理中...' : '使用邀請碼，一起賺點數！'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.textButton}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={[styles.textButtonText, { color: colors.muted.foreground }]}>不使用邀請碼</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.outlineButton, { borderColor: colors.border }]}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={[styles.outlineButtonText, { color: colors.foreground }]}>沒有邀請碼，跳過此步驟</Text>
            </TouchableOpacity>
          )}
        </View>
      </OnboardingCard>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  // Icon Circle
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },

  // Reward Badge
  rewardBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: 100,
    marginBottom: spacing[4],
    alignSelf: 'center',
  },
  rewardBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },

  // Input Section
  inputSection: {
    gap: spacing[2],
  },
  label: {
    fontSize: typography.fontSize.sm,
  },
  inviteCodeInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize.xl,
    textAlign: 'center',
  },

  // Validation
  validatingText: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },
  validCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  validCodeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validCodeContent: {
    flex: 1,
  },
  validCodeTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  validCodeSubtitle: {
    fontSize: typography.fontSize.xs,
  },
  invalidCodeText: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },

  // Buttons
  buttonGroup: {
    gap: spacing[2],
    marginTop: spacing[4],
  },
  primaryButton: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  outlineButtonText: {
    fontSize: typography.fontSize.base,
  },
  textButton: {
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  textButtonText: {
    fontSize: typography.fontSize.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
