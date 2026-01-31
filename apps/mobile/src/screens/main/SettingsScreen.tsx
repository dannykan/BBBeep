/**
 * Settings Screen
 * 設定頁面 - Warm Blue 設計
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useUnreadReply } from '../../context/UnreadReplyContext';
import { displayLicensePlate, usersApi } from '@bbbeeep/shared';
import VehicleIcon from '../../components/VehicleIcon';

// Menu item configuration with colors
interface MenuItemConfig {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  iconColor: string;
  iconBgColor: string;
  onPress: () => void;
  value?: string;
  externalLink?: boolean;
  badgeCount?: number;
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const { unreadReplyCount, refreshUnreadReplyCount } = useUnreadReply();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Refresh unread count on focus
  useFocusEffect(
    React.useCallback(() => {
      refreshUnreadReplyCount();
    }, [refreshUnreadReplyCount])
  );

  const handleLogout = () => {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '刪除帳戶',
      '確定要刪除帳戶嗎？此操作無法復原，所有資料將被永久刪除。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認刪除',
          style: 'destructive',
          onPress: () => {
            // 二次確認
            Alert.alert(
              '最後確認',
              '刪除後將無法恢復您的帳戶、點數和所有訊息紀錄。確定要繼續嗎？',
              [
                { text: '取消', style: 'cancel' },
                {
                  text: '永久刪除',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await usersApi.deleteAccount();
                      Alert.alert('帳戶已刪除', '感謝您使用 UBeep，期待再次相見！', [
                        { text: '確定', onPress: logout },
                      ]);
                    } catch (error: any) {
                      Alert.alert('刪除失敗', error?.response?.data?.message || '請稍後再試');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleFeedback = async () => {
    const email = 'mailto:dannytjkan@gmail.com?subject=UBeep%20問題回報';
    try {
      await Linking.openURL(email);
    } catch (error) {
      Alert.alert('無法開啟', '請手動發送郵件至 dannytjkan@gmail.com');
    }
  };

  // Section 1: Main features
  const section1Items: MenuItemConfig[] = [
    {
      id: 'notifications',
      icon: 'notifications',
      label: '通知設定',
      iconColor: colors.primary.DEFAULT,
      iconBgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
      onPress: () => navigation.navigate('NotificationSettings'),
    },
    {
      id: 'appearance',
      icon: 'color-palette',
      label: '外觀',
      iconColor: isDark ? '#A855F7' : '#9333EA',
      iconBgColor: isDark ? 'rgba(147, 51, 234, 0.15)' : '#F3E8FF',
      onPress: () => navigation.navigate('Appearance'),
    },
    {
      id: 'sent',
      icon: 'paper-plane',
      label: '發送紀錄',
      iconColor: isDark ? '#4ADE80' : '#22C55E',
      iconBgColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
      onPress: () => navigation.navigate('Sent'),
      badgeCount: unreadReplyCount,
    },
    {
      id: 'wallet',
      icon: 'wallet',
      label: '點數',
      iconColor: isDark ? '#FBBF24' : '#D97706',
      iconBgColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
      onPress: () => navigation.navigate('Wallet'),
    },
  ];

  // Section 2: Account
  const section2Items: MenuItemConfig[] = [
    {
      id: 'invite',
      icon: 'person-add',
      label: '邀請好友',
      iconColor: isDark ? '#FBBF24' : '#D97706',
      iconBgColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
      onPress: () => navigation.navigate('InviteFriends'),
    },
    {
      id: 'savedplates',
      icon: 'bookmark',
      label: '車牌收藏',
      iconColor: isDark ? '#FBBF24' : '#D97706',
      iconBgColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
      onPress: () => navigation.navigate('SavedPlates'),
    },
    {
      id: 'blocklist',
      icon: 'ban',
      label: '封鎖名單',
      iconColor: isDark ? '#F87171' : '#DC2626',
      iconBgColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2',
      onPress: () => navigation.navigate('BlockList'),
    },
    {
      id: 'platechange',
      icon: 'car',
      label: '車牌變更',
      iconColor: isDark ? '#60A5FA' : '#2563EB',
      iconBgColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#DBEAFE',
      onPress: () => navigation.navigate('LicensePlateChange'),
    },
  ];

  // Section 3: Support
  const section3Items: MenuItemConfig[] = [
    {
      id: 'legal',
      icon: 'document-text',
      label: '相關條款',
      iconColor: isDark ? '#94A3B8' : '#64748B',
      iconBgColor: isDark ? colors.muted.DEFAULT : '#F1F5F9',
      onPress: () => navigation.navigate('Legal'),
    },
    {
      id: 'feedback',
      icon: 'chatbubble',
      label: '問題回報',
      iconColor: isDark ? '#34D399' : '#10B981',
      iconBgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
      onPress: handleFeedback,
      externalLink: true,
    },
  ];

  const renderMenuItem = (item: MenuItemConfig, isLast: boolean) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: item.iconBgColor }]}>
        <Ionicons name={item.icon} size={18} color={item.iconColor} />
        {item.badgeCount && item.badgeCount > 0 ? (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>
              {item.badgeCount > 99 ? '99+' : item.badgeCount}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.menuLabel}>{item.label}</Text>
      <Ionicons
        name={item.externalLink ? 'open-outline' : 'chevron-forward'}
        size={18}
        color={colors.text.secondary}
      />
    </TouchableOpacity>
  );

  const renderSection = (items: MenuItemConfig[]) => (
    <View style={styles.menuSection}>
      {items.map((item, index) => renderMenuItem(item, index === items.length - 1))}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>設定</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card - Same as HomeScreen */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <VehicleIcon
              userType={user?.userType}
              vehicleType={user?.vehicleType}
              size={28}
              color={colors.primary.DEFAULT}
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.nickname || '用戶'}</Text>
            <View style={styles.profilePlateRow}>
              <View style={styles.userTypeBadge}>
                <Text style={styles.userTypeBadgeText}>
                  {user?.userType === 'pedestrian' ? '行人' : user?.vehicleType === 'motorcycle' ? '機車' : '汽車'}
                </Text>
              </View>
              {user?.licensePlate && (
                <Text style={styles.profilePlate}>{displayLicensePlate(user.licensePlate)}</Text>
              )}
            </View>
          </View>
          <View style={styles.editButton}>
            <Ionicons name="pencil" size={16} color={colors.text.secondary} />
          </View>
        </TouchableOpacity>

        {/* Section 1 */}
        {renderSection(section1Items)}

        {/* Section 2 */}
        {renderSection(section2Items)}

        {/* Section 3 */}
        {renderSection(section3Items)}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>登出</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.deleteAccountText}>刪除帳戶</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>UBeep v1.0.2</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 40,
      gap: 16,
    },

    // Profile Card - Same as HomeScreen userCard
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileInfo: {
      flex: 1,
      gap: 4,
    },
    profileName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
    },
    profilePlateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    userTypeBadge: {
      backgroundColor: colors.primary.bg,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    userTypeBadgeText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary.DEFAULT,
    },
    profilePlate: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.secondary,
      letterSpacing: 1,
    },
    editButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.card.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Menu Section
    menuSection: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
    },
    menuItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#DC2626',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    menuBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    menuLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text.primary,
    },

    // Logout Button
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.destructive.light,
      borderRadius: 14,
      height: 52,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#DC2626',
    },

    // Delete Account Button
    deleteAccountButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
    },
    deleteAccountText: {
      fontSize: 13,
      color: colors.text.secondary,
    },

    // Footer
    footer: {
      alignItems: 'center',
      paddingTop: 16,
    },
    footerText: {
      fontSize: 12,
      color: colors.text.secondary,
    },
  });
