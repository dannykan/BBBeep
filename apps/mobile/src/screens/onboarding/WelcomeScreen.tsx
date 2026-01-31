/**
 * Welcome Screen (Step 6)
 * 歡迎頁面 - 完成註冊
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { OnboardingLayout, OnboardingCard, StepHeader } from './components';
import { usersApi, normalizeLicensePlate } from '@bbbeeep/shared';
import { getErrorMessage } from '../../lib/error-utils';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation: _navigation }: Props) {
  const { refreshUser } = useAuth();
  const { requestPermissions } = useNotifications();
  const { colors, isDark } = useTheme();
  const {
    userType,
    vehicleType,
    licensePlate,
    nickname,
    inviteCodeApplied,
    isLoading,
    setIsLoading,
    getTotalSteps,
  } = useOnboarding();

  // Calculate display step (pedestrians skip license plate)
  const currentStep = userType === 'pedestrian' ? 5 : 6;

  const handleCompleteOnboarding = useCallback(async () => {
    if (!userType) return;

    // 行人不需要車牌
    const shouldHavePlate = userType === 'driver' && licensePlate;
    const normalizedPlate = shouldHavePlate
      ? normalizeLicensePlate(licensePlate)
      : undefined;
    if (shouldHavePlate && !normalizedPlate) {
      Alert.alert('錯誤', '車牌號碼格式無效');
      return;
    }

    setIsLoading(true);
    try {
      await usersApi.completeOnboarding({
        userType,
        vehicleType: userType === 'driver' ? (vehicleType || undefined) : undefined,
        licensePlate: normalizedPlate || undefined,
        nickname: nickname || undefined,
      });
      await refreshUser();

      // 註冊完成後，請求推播通知權限
      // 這會顯示原生的 iOS/Android 權限對話框
      await requestPermissions();
    } catch (error: any) {
      Alert.alert('錯誤', getErrorMessage(error, '完成註冊失敗'));
    } finally {
      setIsLoading(false);
    }
  }, [userType, vehicleType, licensePlate, nickname, setIsLoading, refreshUser, requestPermissions]);

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={getTotalSteps()}>
      <OnboardingCard>
        <StepHeader
          title={userType === 'pedestrian' ? '🙌 歡迎加入！' : '🚦 歡迎上路！'}
          subtitle={
            userType === 'pedestrian'
              ? '你可以開始提醒路上的汽車與機車'
              : '14 天免費試用，80 點讓你盡情體驗'
          }
        >
          <View style={[styles.welcomeIconCircle, { backgroundColor: `${colors.primary.DEFAULT}10` }]}>
            {userType === 'pedestrian' ? (
              <View style={styles.dualIconContainer}>
                <FontAwesome6 name="person-walking" size={20} color={colors.primary.DEFAULT} style={styles.iconTopLeft} />
                <FontAwesome6 name="bicycle" size={20} color={colors.primary.DEFAULT} style={styles.iconBottomRight} />
              </View>
            ) : (
              <FontAwesome6
                name={vehicleType === 'car' ? 'car' : 'motorcycle'}
                size={28}
                color={colors.primary.DEFAULT}
              />
            )}
          </View>
        </StepHeader>

        <Text style={[styles.missionText, { color: colors.muted.foreground }]}>
          我們相信，多數人不是故意的，只是沒被提醒。
        </Text>

        {userType === 'pedestrian' && (
          <View style={[styles.pedestrianInfoCard, { backgroundColor: colors.muted.DEFAULT, borderColor: colors.border }]}>
            <Text style={[styles.pedestrianInfoItem, { color: colors.foreground }]}>✅ 可以發送提醒</Text>
            <Text style={[styles.pedestrianInfoItem, { color: colors.foreground }]}>✅ 14 天試用期，80 點免費體驗</Text>
            <Text style={[styles.pedestrianInfoItemWarning, { color: colors.foreground }]}>
              ⚠️ 因沒有車牌，無法接收提醒
            </Text>
          </View>
        )}

        {inviteCodeApplied && (
          <View style={[styles.inviteAppliedCard, { backgroundColor: isDark ? '#052e16' : '#F0FDF4', borderColor: isDark ? '#166534' : '#BBF7D0' }]}>
            <Text style={[styles.inviteAppliedText, { color: isDark ? '#4ade80' : '#166534' }]}>
              🎉 已使用邀請碼，完成註冊即可獲得獎勵點數
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary.DEFAULT }, isLoading && styles.buttonDisabled]}
          onPress={handleCompleteOnboarding}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary.foreground} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: colors.primary.foreground }]}>開始使用</Text>
          )}
        </TouchableOpacity>
      </OnboardingCard>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  // Welcome Icon
  welcomeIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  dualIconContainer: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  iconTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  iconBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },

  // Mission Text
  missionText: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    transform: [{ skewX: '-8deg' }],
    marginBottom: spacing[4],
  },

  // Pedestrian Info
  pedestrianInfoCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[1],
    marginBottom: spacing[4],
  },
  pedestrianInfoItem: {
    fontSize: typography.fontSize.xs,
  },
  pedestrianInfoItemWarning: {
    fontSize: typography.fontSize.xs,
  },

  // Invite Applied
  inviteAppliedCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  inviteAppliedText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },

  // Buttons
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
  buttonDisabled: {
    opacity: 0.5,
  },
});
