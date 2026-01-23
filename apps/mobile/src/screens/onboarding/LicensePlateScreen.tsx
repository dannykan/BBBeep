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
  Image,
  ScrollView,
} from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { OnboardingLayout, OnboardingCard, StepHeader } from './components';
import {
  licensePlateApi,
  uploadApi,
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
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [applicationEmail, setApplicationEmail] = useState('');
  const [licenseImageUri, setLicenseImageUri] = useState<string | null>(null);
  const [licenseImageUrl, setLicenseImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  const handlePickImage = useCallback(async () => {
    try {
      // 請求權限
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('需要權限', '請允許存取相簿以上傳行照照片');
        return;
      }

      // 先關閉 Modal，避免 iOS 衝突
      setShowApplicationDialog(false);

      // 延遲後開啟圖片選擇器
      setTimeout(async () => {
        try {
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            maxWidth: 1200,
            maxHeight: 900,
          });

          // 重新顯示 Modal
          setShowApplicationDialog(true);

          if (result.canceled || !result.assets?.[0]) return;

          const asset = result.assets[0];
          setLicenseImageUri(asset.uri);

          // 上傳圖片
          setIsUploadingImage(true);
          try {
            const fileName = asset.uri.split('/').pop() || 'license.jpg';
            const fileType = asset.mimeType || 'image/jpeg';

            const uploadResult = await uploadApi.uploadImage({
              uri: asset.uri,
              name: fileName,
              type: fileType,
            });

            setLicenseImageUrl(uploadResult.url);
          } catch (uploadError: any) {
            console.error('[IMAGE_UPLOAD] Upload error:', uploadError);
            Alert.alert('上傳失敗', uploadError.response?.data?.message || '圖片上傳失敗，請重試');
            setLicenseImageUri(null);
          } finally {
            setIsUploadingImage(false);
          }
        } catch (pickerError: any) {
          console.error('[IMAGE_PICKER] Error:', pickerError);
          Alert.alert('錯誤', '無法開啟相簿');
          setShowApplicationDialog(true);
        }
      }, 300);
    } catch (error: any) {
      console.error('[IMAGE_PICKER] Permission error:', error);
      Alert.alert('錯誤', '無法存取相簿權限');
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setLicenseImageUri(null);
    setLicenseImageUrl(null);
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
        licenseImage: licenseImageUrl || undefined,
        email: applicationEmail || undefined,
      });
      // 關閉申請對話框，顯示等待審核對話框
      setShowApplicationDialog(false);
      setShowPendingDialog(true);
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '提交申請失敗');
    } finally {
      setIsLoading(false);
    }
  }, [licensePlate, vehicleType, licenseImageUrl, applicationEmail, navigation, setIsLoading]);

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

            <ScrollView style={styles.applicationFormScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.applicationForm}>
                {/* 行照照片上傳 */}
                <View style={styles.imageUploadSection}>
                  <Text style={styles.label}>行照照片（可加速審核）</Text>
                  {licenseImageUri ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: licenseImageUri }} style={styles.imagePreview} />
                      {isUploadingImage && (
                        <View style={styles.imageUploadingOverlay}>
                          <ActivityIndicator color={colors.primary.foreground} />
                          <Text style={styles.imageUploadingText}>上傳中...</Text>
                        </View>
                      )}
                      {!isUploadingImage && (
                        <TouchableOpacity
                          style={styles.imageRemoveButton}
                          onPress={handleRemoveImage}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle" size={28} color={colors.destructive.DEFAULT} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.imageUploadButton}
                      onPress={handlePickImage}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="camera-outline" size={32} color={colors.muted.foreground} />
                      <Text style={styles.imageUploadButtonText}>點擊上傳行照照片</Text>
                      <Text style={styles.imageUploadHint}>拍攝或選擇行照正面照片</Text>
                    </TouchableOpacity>
                  )}
                </View>

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
                  {licenseImageUrl && (
                    <Text style={styles.applicationInfoItemSuccess}>
                      行照照片：已上傳
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>

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

      {/* Application Pending Dialog */}
      <Modal visible={showPendingDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pendingModalContent}>
            <View style={styles.pendingIconContainer}>
              <Ionicons name="time-outline" size={64} color={colors.primary.DEFAULT} />
            </View>

            <Text style={styles.pendingTitle}>申請已送出</Text>

            <Text style={styles.pendingDescription}>
              我們會在 <Text style={styles.boldText}>1-2 個工作天內</Text> 審核您的申請。
              {applicationEmail ? (
                <>
                  {'\n\n'}審核結果將發送至：{'\n'}
                  <Text style={styles.boldText}>{applicationEmail}</Text>
                </>
              ) : (
                <>
                  {'\n\n'}請留意您的信箱通知。
                </>
              )}
            </Text>

            <View style={styles.pendingInfoCard}>
              <Text style={styles.pendingInfoTitle}>申請車牌</Text>
              <Text style={styles.pendingInfoPlate}>{displayLicensePlate(licensePlate)}</Text>
            </View>

            <View style={styles.pendingNotes}>
              <View style={styles.pendingNoteItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary.DEFAULT} />
                <Text style={styles.pendingNoteText}>審核通過後，您可以繼續完成註冊</Text>
              </View>
              <View style={styles.pendingNoteItem}>
                <Ionicons name="mail-outline" size={18} color={colors.primary.DEFAULT} />
                <Text style={styles.pendingNoteText}>請查收 Email 獲取審核結果</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.pendingButton}
              onPress={() => {
                // 清除狀態，讓用戶可以重新開始或關閉 app
                setShowPendingDialog(false);
                setLicensePlate('');
                setLicenseImageUri(null);
                setLicenseImageUrl(null);
                setApplicationEmail('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.pendingButtonText}>我知道了</Text>
            </TouchableOpacity>
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
  applicationFormScroll: {
    maxHeight: 350,
  },
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
  applicationInfoItemSuccess: {
    fontSize: typography.fontSize.sm,
    color: '#10B981',
    marginTop: spacing[1],
  },

  // Image Upload
  imageUploadSection: {
    gap: spacing[2],
  },
  imageUploadButton: {
    borderWidth: 2,
    borderColor: colors.borderSolid,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.muted.DEFAULT,
  },
  imageUploadButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
    marginTop: spacing[2],
  },
  imageUploadHint: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    marginTop: spacing[1],
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.lg,
  },
  imageUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUploadingText: {
    color: colors.primary.foreground,
    fontSize: typography.fontSize.sm,
    marginTop: spacing[2],
  },
  imageRemoveButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    backgroundColor: colors.card.DEFAULT,
    borderRadius: 14,
  },

  // Pending Dialog
  pendingModalContent: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  pendingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary.DEFAULT}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  pendingTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.foreground,
    marginBottom: spacing[3],
  },
  pendingDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  pendingInfoCard: {
    backgroundColor: colors.muted.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  pendingInfoTitle: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    marginBottom: spacing[1],
  },
  pendingInfoPlate: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.foreground,
    letterSpacing: 2,
  },
  pendingNotes: {
    width: '100%',
    gap: spacing[2],
    marginBottom: spacing[5],
  },
  pendingNoteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pendingNoteText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    flex: 1,
  },
  pendingButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
  },
  pendingButtonText: {
    color: colors.primary.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
});
