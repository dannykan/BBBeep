/**
 * Edit Profile Screen
 * 編輯個人資料頁面
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { usersApi, displayLicensePlate } from '@bbbeeep/shared';
import VehicleIcon from '../../components/VehicleIcon';
import { getErrorMessage } from '../../lib/error-utils';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [isSaving, setIsSaving] = useState(false);

  const isDriver = user?.userType === 'driver';
  const hasLicensePlate = !!user?.licensePlate;
  const hasChanges = nickname !== (user?.nickname || '');

  const handleSave = async () => {
    // Validate nickname
    if (nickname.trim() && nickname.trim().length > 12) {
      Alert.alert('錯誤', '暱稱最多 12 個字');
      return;
    }

    setIsSaving(true);
    try {
      await usersApi.updateMe({
        nickname: nickname.trim() || undefined,
      });
      await refreshUser();
      Alert.alert('成功', '個人資料已更新', [
        { text: '確定', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('錯誤', getErrorMessage(error, '更新失敗'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeLicensePlate = () => {
    navigation.navigate('LicensePlateChange');
  };

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
            <Text style={styles.headerTitle}>編輯個人資料</Text>
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
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <VehicleIcon
                userType={user?.userType}
                vehicleType={user?.vehicleType}
                size={32}
                color={colors.primary.DEFAULT}
              />
            </View>
            <View style={styles.userTypeBadge}>
              <Text style={styles.userTypeBadgeText}>
                {user?.userType === 'pedestrian' ? '行人用戶' : '駕駛用戶'}
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            {/* Nickname */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>暱稱</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="輸入暱稱（最多 12 字）"
                placeholderTextColor={colors.text.secondary}
                maxLength={12}
              />
              <Text style={styles.formHint}>{nickname.length} / 12</Text>
            </View>

            {/* License Plate (only for drivers) */}
            {isDriver && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>車牌號碼</Text>
                <View style={styles.licensePlateRow}>
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyText}>
                      {hasLicensePlate
                        ? displayLicensePlate(user?.licensePlate || '')
                        : '尚未設定'}
                    </Text>
                  </View>
                  {hasLicensePlate && (
                    <TouchableOpacity
                      style={styles.changePlateButton}
                      onPress={handleChangeLicensePlate}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.changePlateButtonText}>申請變更</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.formHint}>
                  {hasLicensePlate
                    ? '如需變更車牌，請提交申請並上傳行照照片'
                    : '僅用於接收提醒，不會公開顯示'}
                </Text>
              </View>
            )}

            {/* Vehicle Type (read-only) */}
            {isDriver && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>車輛類型</Text>
                <View style={styles.readOnlyField}>
                  <VehicleIcon
                    userType={user?.userType}
                    vehicleType={user?.vehicleType}
                    size={20}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.readOnlyText}>
                    {user?.vehicleType === 'car' ? '汽車' : '機車'}
                  </Text>
                </View>
                <Text style={styles.formHint}>
                  車輛類型無法變更
                </Text>
              </View>
            )}
          </View>

          {/* Account Info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>帳戶資訊</Text>
            <View style={styles.infoCard}>
              {user?.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>手機號碼</Text>
                  <Text style={styles.infoValue}>
                    {user.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1-$2-$3')}
                  </Text>
                </View>
              )}
              {user?.lineDisplayName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>LINE 帳號</Text>
                  <Text style={styles.infoValue}>{user.lineDisplayName}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasChanges || isSaving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.primary.foreground} />
            ) : (
              <Text style={styles.saveButtonText}>儲存變更</Text>
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
      gap: 24,
    },

    // Avatar Section
    avatarSection: {
      alignItems: 'center',
      gap: 12,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userTypeBadge: {
      backgroundColor: colors.muted.DEFAULT,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
    },
    userTypeBadgeText: {
      fontSize: 12,
      color: colors.text.secondary,
    },

    // Form Section
    formSection: {
      gap: 16,
    },
    formGroup: {
      gap: 8,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
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
    formHint: {
      fontSize: 12,
      color: colors.text.secondary,
      paddingLeft: 4,
    },
    licensePlateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    readOnlyField: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    readOnlyText: {
      fontSize: 16,
      color: colors.text.secondary,
    },
    changePlateButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    changePlateButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.primary.foreground,
    },

    // Info Section
    infoSection: {
      gap: 8,
    },
    infoSectionTitle: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text.secondary,
      textTransform: 'uppercase',
      paddingLeft: 4,
    },
    infoCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    infoValue: {
      fontSize: 14,
      color: colors.text.primary,
    },

    // Save Button
    saveButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.primary.foreground,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
  });
