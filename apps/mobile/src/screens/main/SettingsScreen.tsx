/**
 * Settings Screen
 * 設定頁面 - 對齊 Web 版本設計
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import VehicleIcon from '../../components/VehicleIcon';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeMode, ThemeColors } from '../../context/ThemeContext';
import { getTotalPoints, displayLicensePlate } from '@bbbeeep/shared';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

const themeModeLabels: Record<ThemeMode, string> = {
  light: '淺色',
  dark: '深色',
  system: '跟隨系統',
};

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { themeMode, colors } = useTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);
  const totalPoints = getTotalPoints(user);

  const handleLogout = () => {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '登出',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const MenuItem = ({
    icon,
    label,
    value,
    onPress,
    showChevron = true,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.menuLeft}>
        <View style={styles.menuIconContainer}>
          <Ionicons name={icon} size={18} color={colors.primary.DEFAULT} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {onPress && showChevron && (
          <Ionicons name="chevron-forward" size={18} color={colors.muted.foreground} />
        )}
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      {/* Header with safe area */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>設定</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <VehicleIcon
                userType={user?.userType}
                vehicleType={user?.vehicleType}
                size={24}
                color={colors.primary.DEFAULT}
              />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>
              {user?.nickname || '未設定暱稱'}
            </Text>
            {user?.licensePlate && (
              <View style={styles.licensePlateContainer}>
                <VehicleIcon
                  userType={user?.userType}
                  vehicleType={user?.vehicleType}
                  size={12}
                  color={colors.muted.foreground}
                />
                <Text style={styles.licensePlate}>
                  {displayLicensePlate(user.licensePlate)}
                </Text>
              </View>
            )}
            <View style={styles.userTypeBadge}>
              <Text style={styles.userTypeBadgeText}>
                {user?.userType === 'pedestrian' ? '行人用戶' : '駕駛用戶'}
              </Text>
            </View>
          </View>
        </View>

        {/* Points Card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <View style={styles.pointsIconContainer}>
              <Ionicons name="wallet-outline" size={20} color={colors.primary.DEFAULT} />
            </View>
            <View style={styles.pointsInfo}>
              <Text style={styles.pointsLabel}>剩餘點數</Text>
              <Text style={styles.pointsValue}>{totalPoints} 點</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.topUpButton}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={16} color={colors.primary.foreground} />
            <Text style={styles.topUpButtonText}>儲值</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>功能</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="gift-outline"
              label="邀請好友"
              value="你我各得 10 點"
              onPress={() => navigation.navigate('InviteFriends')}
            />
            <MenuItem
              icon="time-outline"
              label="已發送提醒"
              onPress={() => navigation.navigate('Sent')}
            />
            <MenuItem
              icon="ban-outline"
              label="封鎖名單"
              onPress={() => navigation.navigate('BlockList')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>帳戶</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="person-outline"
              label="編輯個人資料"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <MenuItem
              icon="notifications-outline"
              label="通知設定"
              onPress={() => navigation.navigate('NotificationSettings')}
            />
            <MenuItem
              icon="contrast-outline"
              label="外觀模式"
              value={themeModeLabels[themeMode]}
              onPress={() => navigation.navigate('Appearance')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>關於</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="document-text-outline"
              label="服務條款"
              onPress={() => navigation.navigate('Legal', { type: 'terms' })}
            />
            <MenuItem
              icon="shield-outline"
              label="隱私權政策"
              onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
            />
            <MenuItem
              icon="information-circle-outline"
              label="版本"
              value="v1.0.0"
              showChevron={false}
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.destructive.DEFAULT} />
          <Text style={styles.logoutText}>登出</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>UBeep - 路上善意提醒平台</Text>
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
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },

    // Scroll Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing[6],
      gap: spacing[4],
    },

    // Profile Card
    profileCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: borderRadius.lg,
      padding: spacing[5],
      borderWidth: 1,
      borderColor: colors.borderSolid,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[4],
    },
    avatarContainer: {
      alignItems: 'center',
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileInfo: {
      flex: 1,
      gap: spacing[1],
    },
    nickname: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },
    licensePlateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
    },
    licensePlate: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
      fontFamily: 'monospace',
    },
    userTypeBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.muted.DEFAULT,
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[0.5],
      borderRadius: borderRadius.sm,
      marginTop: spacing[1],
    },
    userTypeBadgeText: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },

    // Points Card
    pointsCard: {
      backgroundColor: colors.primary.soft,
      borderRadius: borderRadius.lg,
      padding: spacing[4],
      borderWidth: 1,
      borderColor: `${colors.primary.DEFAULT}20`,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pointsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
    },
    pointsIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary.DEFAULT}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pointsInfo: {
      gap: spacing[0.5],
    },
    pointsLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },
    pointsValue: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold as any,
      color: colors.foreground,
    },
    topUpButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      backgroundColor: colors.primary.DEFAULT,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: borderRadius.lg,
    },
    topUpButtonText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.foreground,
    },

    // Sections
    section: {
      gap: spacing[2],
    },
    sectionTitle: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.muted.foreground,
      textTransform: 'uppercase',
      paddingLeft: spacing[1],
    },
    menuGroup: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing[3.5],
      paddingHorizontal: spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSolid,
    },
    menuLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
    },
    menuIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
    },
    menuRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    menuValue: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
    },

    // Logout
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      backgroundColor: colors.card.DEFAULT,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.destructive.DEFAULT,
      paddingVertical: spacing[3.5],
      marginTop: spacing[2],
    },
    logoutText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.destructive.DEFAULT,
    },

    // Footer
    footer: {
      alignItems: 'center',
      paddingVertical: spacing[6],
    },
    footerText: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },
  });
