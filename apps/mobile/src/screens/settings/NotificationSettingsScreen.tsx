/**
 * Notification Settings Screen
 * 通知設定頁面
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

export default function NotificationSettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // Local state for notification preferences
  const [pushEnabled, setPushEnabled] = useState(true);
  const [newMessageNotif, setNewMessageNotif] = useState(true);
  const [replyNotif, setReplyNotif] = useState(true);
  const [promotionNotif, setPromotionNotif] = useState(false);

  const handleOpenSystemSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const SettingRow = ({
    icon,
    label,
    description,
    value,
    onValueChange,
    disabled,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon} size={18} color={disabled ? colors.muted.foreground : colors.primary.DEFAULT} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, disabled && styles.settingLabelDisabled]}>
          {label}
        </Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.muted.DEFAULT, true: colors.primary.DEFAULT }}
        thumbColor={colors.card.DEFAULT}
        ios_backgroundColor={colors.muted.DEFAULT}
      />
    </View>
  );

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
            <Text style={styles.headerTitle}>通知設定</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>推播通知</Text>
          <View style={styles.settingCard}>
            <SettingRow
              icon="notifications"
              label="啟用推播通知"
              description="接收來自 UBeep 的即時通知"
              value={pushEnabled}
              onValueChange={setPushEnabled}
            />
          </View>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知類型</Text>
          <View style={styles.settingCard}>
            <SettingRow
              icon="mail"
              label="新提醒通知"
              description="當有人傳送提醒給你時通知"
              value={newMessageNotif}
              onValueChange={setNewMessageNotif}
              disabled={!pushEnabled}
            />
            <View style={styles.settingDivider} />
            <SettingRow
              icon="chatbubble"
              label="回覆通知"
              description="當對方回覆你的提醒時通知"
              value={replyNotif}
              onValueChange={setReplyNotif}
              disabled={!pushEnabled}
            />
            <View style={styles.settingDivider} />
            <SettingRow
              icon="megaphone"
              label="活動與優惠"
              description="接收最新活動和優惠資訊"
              value={promotionNotif}
              onValueChange={setPromotionNotif}
              disabled={!pushEnabled}
            />
          </View>
        </View>

        {/* System Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>系統設定</Text>
          <TouchableOpacity
            style={styles.linkCard}
            onPress={handleOpenSystemSettings}
            activeOpacity={0.7}
          >
            <View style={styles.linkCardContent}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="settings" size={18} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>系統通知設定</Text>
                <Text style={styles.settingDescription}>
                  前往系統設定調整通知權限
                </Text>
              </View>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.infoText}>
            如果您在系統設定中關閉了 UBeep 的通知權限，即使在此處開啟也無法收到推播通知。
          </Text>
        </View>
      </ScrollView>
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
      fontSize: 12,
      fontWeight: '500',
      color: colors.text.secondary,
      textTransform: 'uppercase',
      paddingLeft: 4,
    },

    // Setting Card
    settingCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    settingRowDisabled: {
      opacity: 0.5,
    },
    settingIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingContent: {
      flex: 1,
      gap: 2,
    },
    settingLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    settingLabelDisabled: {
      color: colors.text.secondary,
    },
    settingDescription: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    settingDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 60,
    },

    // Link Card
    linkCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    linkCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
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
    infoText: {
      flex: 1,
      fontSize: 12,
      color: colors.text.secondary,
      lineHeight: 18,
    },
  });
