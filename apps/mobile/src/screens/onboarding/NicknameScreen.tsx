/**
 * Nickname Screen (Step 3)
 * 設定暱稱（可跳過）
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingLayout, OnboardingCard, StepHeader } from './components';
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Nickname'>;

export default function NicknameScreen({ navigation }: Props) {
  const { nickname, setNickname, userType, getTotalSteps } = useOnboarding();

  // Calculate display step (pedestrians skip license plate)
  const currentStep = userType === 'pedestrian' ? 2 : 3;

  const handleNext = () => {
    navigation.navigate('PointsExplanation');
  };

  const handleSkip = () => {
    setNickname('');
    navigation.navigate('PointsExplanation');
  };

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={getTotalSteps()}>
      <OnboardingCard>
        <StepHeader
          title="設定一個暱稱（可跳過）"
          subtitle={`暱稱只會以匿名方式顯示\n不設定也能完整使用所有功能`}
        />

        <View style={styles.inputSection}>
          <Text style={styles.label}>暱稱</Text>
          <TextInput
            style={styles.input}
            placeholder="例如：熱心駕駛、路過提醒一下"
            placeholderTextColor={colors.muted.foreground}
            value={nickname}
            onChangeText={setNickname}
            maxLength={12}
          />
          <Text style={styles.inputHint}>最多 12 個字</Text>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>
              {nickname.trim() ? '設定暱稱並繼續' : '跳過'}
            </Text>
          </TouchableOpacity>
          {nickname.trim() !== '' && (
            <TouchableOpacity
              style={styles.textButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.textButtonText}>跳過</Text>
            </TouchableOpacity>
          )}
        </View>
      </OnboardingCard>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  // Input Section
  inputSection: {
    gap: spacing[2],
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    backgroundColor: colors.card.DEFAULT,
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },

  // Buttons
  buttonGroup: {
    gap: spacing[2],
    marginTop: spacing[4],
  },
  primaryButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: colors.primary.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  textButton: {
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  textButtonText: {
    color: colors.muted.foreground,
    fontSize: typography.fontSize.sm,
  },
});
