/**
 * License Plate Screen (Step 2 for drivers)
 * 輸入車牌
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingLayout, OnboardingCard, StepHeader } from './components';
import {
  licensePlateApi,
  normalizeLicensePlate,
  displayLicensePlate,
} from '@bbbeeep/shared';
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'LicensePlate'>;

export default function LicensePlateScreen({ navigation }: Props) {
  const {
    vehicleType,
    licensePlate,
    setLicensePlate,
    licensePlateCheckResult,
    setLicensePlateCheckResult,
    isLoading,
    setIsLoading,
    getTotalSteps,
  } = useOnboarding();

  const [showLicensePlateDialog, setShowLicensePlateDialog] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [applicationEmail, setApplicationEmail] = useState('');

  const handleLicensePlateChange = useCallback((text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setLicensePlate(cleaned);
  }, [setLicensePlate]);

  const handleSubmit = useCallback(async () => {
    if (!licensePlate) return;

    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!normalizedPlate) {
      Alert.alert('錯誤', '車牌號碼格式無效');
      return;
    }

    setIsLoading(true);
    try {
      const checkResult = await licensePlateApi.checkAvailability(normalizedPlate);
      if (checkResult.isBound) {
        setLicensePlateCheckResult(checkResult);
        setShowLicensePlateDialog(true);
      } else {
        navigation.navigate('Nickname');
      }
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '檢查車牌失敗');
    } finally {
      setIsLoading(false);
    }
  }, [licensePlate, navigation, setIsLoading, setLicensePlateCheckResult]);

  const handleConfirmApplication = useCallback(() => {
    setShowLicensePlateDialog(false);
    setShowApplicationDialog(true);
  }, []);

  const handleSubmitApplication = useCallback(async () => {
    if (!licensePlate) return;

    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!normalizedPlate) {
      Alert.alert('錯誤', '車牌號碼格式無效');
      return;
    }

    setIsLoading(true);
    try {
      await licensePlateApi.createApplication({
        licensePlate: normalizedPlate,
        vehicleType: vehicleType || undefined,
        email: applicationEmail || undefined,
      });
      Alert.alert('成功', '申請已提交，我們會在 1-2 個工作天內以 Email 通知');
      setShowApplicationDialog(false);
      navigation.navigate('Nickname');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '提交申請失敗');
    } finally {
      setIsLoading(false);
    }
  }, [licensePlate, vehicleType, applicationEmail, navigation, setIsLoading]);

  return (
    <OnboardingLayout currentStep={2} totalSteps={getTotalSteps()}>
      <OnboardingCard>
        <StepHeader
          title="填寫你的車牌"
          subtitle={`只用來接收提醒\n不會公開、不會被其他人看到`}
        >
          <View style={styles.vehicleTypeBadge}>
            <FontAwesome6
              name={vehicleType === 'car' ? 'car' : 'motorcycle'}
              size={18}
              color={colors.primary.DEFAULT}
            />
            <Text style={styles.vehicleTypeBadgeText}>
              {vehicleType === 'car' ? '汽車駕駛' : '機車騎士'}
            </Text>
          </View>
        </StepHeader>

        <View style={styles.inputSection}>
          <Text style={styles.label}>
            {vehicleType === 'car' ? '汽車車牌' : '機車車牌'}
          </Text>
          <TextInput
            style={styles.licensePlateInput}
            placeholder={vehicleType === 'car' ? 'ABC1234' : 'ABC123'}
            placeholderTextColor={colors.muted.foreground}
            value={licensePlate}
            onChangeText={handleLicensePlateChange}
            maxLength={8}
            autoCapitalize="characters"
          />
          <Text style={styles.inputHintCenter}>
            {vehicleType === 'car'
              ? '格式範例：ABC1234 或 ABC-1234'
              : '格式範例：ABC123 或 ABC-123'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            styles.buttonMarginTop,
            !licensePlate && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!licensePlate || isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary.foreground} />
          ) : (
            <Text style={styles.primaryButtonText}>下一步</Text>
          )}
        </TouchableOpacity>
      </OnboardingCard>

      {/* License Plate Bound Dialog */}
      <Modal visible={showLicensePlateDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>車牌已被登記</Text>
            <Text style={styles.modalDescription}>
              該車牌號碼{' '}
              <Text style={styles.boldText}>
                {displayLicensePlate(licensePlate)}
              </Text>{' '}
              已被綁定到手機號碼{' '}
              <Text style={styles.boldText}>
                {licensePlateCheckResult?.boundPhone}
              </Text>
              {licensePlateCheckResult?.boundNickname &&
                ` (${licensePlateCheckResult.boundNickname})`}
              。{'\n\n'}這是否為您的車輛？
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setShowLicensePlateDialog(false);
                  setLicensePlate('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSecondaryButtonText}>
                  不是，重新輸入
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleConfirmApplication}
                activeOpacity={0.7}
              >
                <Text style={styles.modalPrimaryButtonText}>是，提交申請</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* License Plate Application Dialog */}
      <Modal visible={showApplicationDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>提交車牌申請</Text>
            <Text style={styles.modalDescription}>
              請提供 Email 以接收審核通知，我們會在 1-2 個工作天內審核。
            </Text>

            <View style={styles.applicationForm}>
              <Text style={styles.label}>Email（用於接收審核通知）</Text>
              <TextInput
                style={styles.input}
                placeholder="請輸入您的 Email"
                placeholderTextColor={colors.muted.foreground}
                value={applicationEmail}
                onChangeText={setApplicationEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.applicationInfo}>
                <Text style={styles.applicationInfoTitle}>申請資訊</Text>
                <Text style={styles.applicationInfoItem}>
                  車牌號碼：{displayLicensePlate(licensePlate)}
                </Text>
                <Text style={styles.applicationInfoItem}>
                  車輛類型：{vehicleType === 'car' ? '汽車' : '機車'}
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setShowApplicationDialog(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSecondaryButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleSubmitApplication}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.modalPrimaryButtonText}>
                  {isLoading ? '提交中...' : '提交申請'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  // Vehicle Type Badge
  vehicleTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  vehicleTypeBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.primary.DEFAULT,
  },

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
  licensePlateInput: {
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
    color: colors.foreground,
    backgroundColor: colors.card.DEFAULT,
  },
  inputHintCenter: {
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonMarginTop: {
    marginTop: spacing[4],
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  modalContent: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  modalDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  boldText: {
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.foreground,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  modalSecondaryButton: {
    flex: 1,
    backgroundColor: colors.muted.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  modalPrimaryButton: {
    flex: 1,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.primary.foreground,
  },

  // Application Form
  applicationForm: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  applicationInfo: {
    backgroundColor: colors.muted.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  applicationInfoTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  applicationInfoItem: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },
});
