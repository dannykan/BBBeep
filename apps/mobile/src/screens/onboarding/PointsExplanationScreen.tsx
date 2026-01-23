/**
 * Points Explanation Screen (Step 4)
 * 點數說明
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

type Props = NativeStackScreenProps<OnboardingStackParamList, 'PointsExplanation'>;

export default function PointsExplanationScreen({ navigation }: Props) {
  const { userType, getTotalSteps } = useOnboarding();

  // Calculate display step (pedestrians skip license plate)
  const currentStep = userType === 'pedestrian' ? 3 : 4;

  const handleNext = () => {
    navigation.navigate('InviteCode');
  };

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={getTotalSteps()}>
      <OnboardingCard>
        <StepHeader title={`每一次提醒\n都需要一點點點數`} />

        <View style={styles.pointsInfoList}>
          <View style={styles.pointsInfoItem}>
            <Text style={styles.pointsInfoIcon}>📩</Text>
            <Text style={styles.pointsInfoText}>發送提醒會消耗點數</Text>
          </View>
          <View style={styles.pointsInfoItem}>
            <Text style={styles.pointsInfoIcon}>👍</Text>
            <Text style={styles.pointsInfoText}>收到讚美，可以獲得少量點數</Text>
          </View>
          <View style={styles.pointsInfoItem}>
            <Text style={styles.pointsInfoIcon}>🔒</Text>
            <Text style={styles.pointsInfoText}>車牌與個人資訊都不會公開</Text>
          </View>
        </View>

        <View style={styles.bonusCard}>
          <Text style={styles.bonusCardText}>
            🎁 每天免費 2 點，用完隔天自動補滿
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>下一步</Text>
        </TouchableOpacity>
      </OnboardingCard>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  // Points Info
  pointsInfoList: {
    backgroundColor: colors.muted.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  pointsInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  pointsInfoIcon: {
    fontSize: typography.fontSize.sm,
  },
  pointsInfoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  bonusCard: {
    backgroundColor: `${colors.primary.DEFAULT}08`,
    borderWidth: 2,
    borderColor: `${colors.primary.DEFAULT}30`,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  bonusCardText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.primary.dark,
    textAlign: 'center',
  },

  // Buttons
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
});
