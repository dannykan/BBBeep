/**
 * Success Screen
 * 發送成功
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useSend } from '../../context/SendContext';
import { SendLayout } from './components';
import { displayLicensePlate } from '@bbbeeep/shared';
import { colors, typography, spacing, borderRadius } from '../../theme';

export default function SuccessScreen() {
  const navigation = useNavigation<any>();
  const { targetPlate, resetSend } = useSend();

  const handleGoHome = () => {
    // Navigate to Home tab
    navigation.getParent()?.navigate('Home');
  };

  const handleSendAnother = () => {
    resetSend();
    // Reset to VehicleType screen
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'VehicleType' }],
      })
    );
  };

  return (
    <SendLayout
      currentStep={5}
      totalSteps={5}
      title="送出成功"
      showBackButton={false}
      showProgress={false}
    >
      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={48} color="#16A34A" />
        </View>

        {/* Success message */}
        <Text style={styles.title}>提醒已送出</Text>
        <Text style={styles.subtitle}>
          已成功送出提醒給 {displayLicensePlate(targetPlate)}
        </Text>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            對方會在下次開啟 App 時收到你的提醒
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGoHome}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>返回首頁</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSendAnother}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>繼續發送</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.muted.foreground,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  infoCard: {
    backgroundColor: colors.muted.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[8],
    width: '100%',
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    gap: spacing[3],
  },
  primaryButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.primary.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
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
