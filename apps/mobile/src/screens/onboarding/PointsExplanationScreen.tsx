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

        {/* 試用期說明卡片 */}
        <View style={styles.trialCard}>
          <Text style={styles.trialTitle}>7 天免費試用</Text>
          <View style={styles.trialPointsRow}>
            <Text style={styles.trialPointsNumber}>50</Text>
            <Text style={styles.trialPointsLabel}>點</Text>
          </View>
          <Text style={styles.trialDescription}>
            立即獲得 50 點，盡情體驗所有功能
          </Text>
        </View>

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
            <Text style={styles.pointsInfoIcon}>🎁</Text>
            <Text style={styles.pointsInfoText}>邀請好友，你我各得點數獎勵</Text>
          </View>
          <View style={styles.pointsInfoItem}>
            <Text style={styles.pointsInfoIcon}>🔒</Text>
            <Text style={styles.pointsInfoText}>車牌與個人資訊都不會公開</Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteCardText}>
            試用期結束後可透過儲值或邀請好友獲得更多點數
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
  // Trial Card
  trialCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  trialTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: '#10B981',
    marginBottom: spacing[2],
  },
  trialPointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing[2],
  },
  trialPointsNumber: {
    fontSize: 48,
    fontWeight: typography.fontWeight.bold as any,
    color: '#10B981',
  },
  trialPointsLabel: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium as any,
    color: '#10B981',
    marginLeft: spacing[1],
  },
  trialDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    textAlign: 'center',
  },

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
  noteCard: {
    backgroundColor: colors.muted.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  noteCardText: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
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
