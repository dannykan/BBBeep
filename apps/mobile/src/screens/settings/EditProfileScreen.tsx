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
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      Alert.alert('錯誤', error.response?.data?.message || '更新失敗');
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
                color={colors.muted.foreground}
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                placeholderTextColor={colors.muted.foreground}
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
                    color={colors.muted.foreground}
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    headerContainer: {
      backgroundColor: colors.card.DEFAULT,
    },
    headerSafeArea: {
      backgroundColor: colors.card.DEFAULT,
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSolid,
      paddingHorizontal: spacing[6],
      paddingVertical: spacing[4],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing[1],
    },
    backText: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
      marginLeft: spacing[1],
    },
    headerTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.normal as any,
      color: colors.foreground,
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
      padding: spacing[6],
      gap: spacing[6],
    },

    // Avatar Section
    avatarSection: {
      alignItems: 'center',
      gap: spacing[3],
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userTypeBadge: {
      backgroundColor: colors.muted.DEFAULT,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: borderRadius.full,
    },
    userTypeBadgeText: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },

    // Form Section
    formSection: {
      gap: spacing[4],
    },
    formGroup: {
      gap: spacing[2],
    },
    formLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },
    input: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      fontSize: typography.fontSize.base,
      color: colors.foreground,
    },
    formHint: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
      paddingLeft: spacing[1],
    },
    licensePlateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    readOnlyField: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    readOnlyText: {
      fontSize: typography.fontSize.base,
      color: colors.muted.foreground,
    },
    changePlateButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
    },
    changePlateButtonText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.foreground,
    },

    // Info Section
    infoSection: {
      gap: spacing[2],
    },
    infoSectionTitle: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.muted.foreground,
      textTransform: 'uppercase',
      paddingLeft: spacing[1],
    },
    infoCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      padding: spacing[4],
      gap: spacing[3],
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
    },
    infoValue: {
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
    },

    // Save Button
    saveButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing[3.5],
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.foreground,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
  });
