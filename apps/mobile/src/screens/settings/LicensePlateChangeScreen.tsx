/**
 * License Plate Change Screen
 * 車牌變更申請頁面
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import {
  licensePlateApi,
  uploadApi,
  normalizeLicensePlate,
  displayLicensePlate,
} from '@bbbeeep/shared';
import VehicleIcon from '../../components/VehicleIcon';

export default function LicensePlateChangeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [newLicensePlate, setNewLicensePlate] = useState('');
  const [email, setEmail] = useState('');
  const [licenseImageUri, setLicenseImageUri] = useState<string | null>(null);
  const [licenseImageUrl, setLicenseImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentLicensePlate = user?.licensePlate || '';
  const vehicleType = user?.vehicleType || 'car';

  const handleLicensePlateChange = useCallback((text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setNewLicensePlate(cleaned);
  }, []);

  const uploadImage = useCallback(async (uri: string, mimeType: string) => {
    setIsUploading(true);
    try {
      // Get file name from uri
      const fileName = uri.split('/').pop() || 'image.jpg';

      // Upload to server
      const result = await uploadApi.uploadImage({
        uri,
        name: fileName,
        type: mimeType,
      });

      setLicenseImageUrl(result.url);
      setLicenseImageUri(uri);
    } catch (error: any) {
      Alert.alert('上傳失敗', error.response?.data?.message || '圖片上傳失敗，請稍後再試');
      setLicenseImageUri(null);
      setLicenseImageUrl(null);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handlePickImage = useCallback(async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('權限不足', '需要相簿存取權限才能上傳行照照片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      await uploadImage(asset.uri, mimeType);
    }
  }, [uploadImage]);

  const handleTakePhoto = useCallback(async () => {
    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('權限不足', '需要相機存取權限才能拍攝行照照片');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      await uploadImage(asset.uri, mimeType);
    }
  }, [uploadImage]);

  const handleSelectImage = useCallback(() => {
    Alert.alert(
      '上傳行照照片',
      '請選擇上傳方式',
      [
        { text: '拍照', onPress: handleTakePhoto },
        { text: '從相簿選擇', onPress: handlePickImage },
        { text: '取消', style: 'cancel' },
      ]
    );
  }, [handleTakePhoto, handlePickImage]);

  const handleRemoveImage = useCallback(() => {
    setLicenseImageUri(null);
    setLicenseImageUrl(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate new license plate
    if (!newLicensePlate) {
      Alert.alert('錯誤', '請輸入新的車牌號碼');
      return;
    }

    const normalizedPlate = normalizeLicensePlate(newLicensePlate);
    if (!normalizedPlate) {
      Alert.alert('錯誤', '車牌號碼格式無效');
      return;
    }

    // Check if same as current
    if (normalizedPlate === normalizeLicensePlate(currentLicensePlate)) {
      Alert.alert('錯誤', '新車牌與目前車牌相同');
      return;
    }

    // Require license image
    if (!licenseImageUrl) {
      Alert.alert('錯誤', '請上傳行照照片以驗證車牌所有權');
      return;
    }

    setIsSubmitting(true);
    try {
      await licensePlateApi.createApplication({
        licensePlate: normalizedPlate,
        vehicleType: vehicleType,
        licenseImage: licenseImageUrl,
        email: email || undefined,
      });

      Alert.alert(
        '申請已送出',
        '我們會在 1-2 個工作天內審核您的申請。如有提供 Email，審核結果會以 Email 通知。',
        [{ text: '確定', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '提交申請失敗');
    } finally {
      setIsSubmitting(false);
    }
  }, [newLicensePlate, currentLicensePlate, licenseImageUrl, vehicleType, email, navigation]);

  const canSubmit = newLicensePlate && licenseImageUrl && !isSubmitting && !isUploading;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.text.secondary}
              />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>車牌變更申請</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Current License Plate */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>目前車牌</Text>
            <View style={styles.currentPlateCard}>
              <VehicleIcon
                userType="driver"
                vehicleType={vehicleType}
                size={20}
                color={colors.text.secondary}
              />
              <Text style={styles.currentPlateText}>
                {displayLicensePlate(currentLicensePlate) || '尚未設定'}
              </Text>
            </View>
          </View>

          {/* New License Plate */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>新車牌號碼</Text>
            <TextInput
              style={styles.input}
              value={newLicensePlate}
              onChangeText={handleLicensePlateChange}
              placeholder={vehicleType === 'car' ? 'ABC1234' : 'ABC123'}
              placeholderTextColor={colors.text.secondary}
              autoCapitalize="characters"
              maxLength={8}
            />
            <Text style={styles.inputHint}>
              {vehicleType === 'car'
                ? '格式範例：ABC1234（「-」可以不用輸入）'
                : '格式範例：ABC123（「-」可以不用輸入）'}
            </Text>
          </View>

          {/* License Image Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>行照照片</Text>
            <Text style={styles.sectionDescription}>
              請上傳車輛行照照片，以驗證您對該車牌的所有權
            </Text>

            {licenseImageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: licenseImageUri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                {isUploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color={colors.primary.foreground} size="large" />
                    <Text style={styles.uploadingText}>上傳中...</Text>
                  </View>
                )}
                {!isUploading && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleRemoveImage}
                  >
                    <Ionicons name="close-circle" size={28} color={colors.destructive.DEFAULT} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleSelectImage}
                activeOpacity={0.7}
                disabled={isUploading}
              >
                <Ionicons name="camera-outline" size={32} color={colors.primary.DEFAULT} />
                <Text style={styles.uploadButtonText}>點擊上傳行照照片</Text>
                <Text style={styles.uploadButtonHint}>支援拍照或從相簿選擇</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Email (Optional) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email（選填）</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="用於接收審核結果通知"
              placeholderTextColor={colors.text.secondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.text.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                申請審核通常需要 1-2 個工作天。審核通過後，您的車牌會自動更新。
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primary.foreground} />
            ) : (
              <Text style={styles.submitButtonText}>提交申請</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean = false) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    headerContainer: {
      backgroundColor: colors.background,
    },
    headerSafeArea: {
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 4,
      zIndex: 1,
    },
    backText: {
      fontSize: 14,
      color: colors.text.secondary,
      marginLeft: 4,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 80,
    },

    // Content
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      gap: 20,
    },

    // Section
    section: {
      gap: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    sectionDescription: {
      fontSize: 12,
      color: colors.text.secondary,
      lineHeight: 18,
    },

    // Current Plate
    currentPlateCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    currentPlateText: {
      fontSize: 16,
      color: colors.text.secondary,
    },

    // Input
    input: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text.primary,
    },
    inputHint: {
      fontSize: 12,
      color: colors.text.secondary,
      paddingLeft: 4,
    },

    // Image Upload
    uploadButton: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    uploadButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.primary.DEFAULT,
    },
    uploadButtonHint: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    imagePreviewContainer: {
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
    },
    imagePreview: {
      width: '100%',
      height: 200,
      borderRadius: 16,
    },
    uploadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    uploadingText: {
      fontSize: 14,
      color: '#FFFFFF',
    },
    removeImageButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 14,
    },

    // Info Card
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: 16,
      padding: 16,
    },
    infoContent: {
      flex: 1,
    },
    infoText: {
      fontSize: 12,
      color: colors.text.secondary,
      lineHeight: 18,
    },

    // Submit Button
    submitButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.primary.foreground,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
  });
