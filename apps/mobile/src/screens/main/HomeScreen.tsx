/**
 * Home Screen
 * 首頁 - 對齊 Web 版本設計
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import VehicleIcon from '../../components/VehicleIcon';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { getTotalPoints, displayLicensePlate, inviteApi, usersApi } from '@bbbeeep/shared';
import type { InviteCodeResponse, TrialStatusResponse } from '@bbbeeep/shared';
import { useUnread } from '../../context/UnreadContext';
import { useUnreadReply } from '../../context/UnreadReplyContext';
import {
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../../theme';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const { colors, isDark } = useTheme();
  const { unreadCount, refreshUnreadCount } = useUnread();
  const { unreadReplyCount, refreshUnreadReplyCount, hasUnreadReplies } = useUnreadReply();
  const [refreshing, setRefreshing] = useState(false);
  const [inviteData, setInviteData] = useState<InviteCodeResponse | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [trialStatus, setTrialStatus] = useState<TrialStatusResponse | null>(null);
  const [isLoadingTrial, setIsLoadingTrial] = useState(true);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // 當畫面獲得焦點時刷新用戶資料（包含點數）
  useFocusEffect(
    useCallback(() => {
      refreshUser();
      loadInviteData();
      loadTrialStatus();
      refreshUnreadCount();
      refreshUnreadReplyCount();
    }, [refreshUser, loadInviteData, loadTrialStatus, refreshUnreadCount, refreshUnreadReplyCount])
  );

  const loadInviteData = useCallback(async () => {
    try {
      const data = await inviteApi.getMyCode();
      setInviteData(data);
    } catch (error) {
      console.error('Failed to load invite data:', error);
    } finally {
      setIsLoadingInvite(false);
    }
  }, []);

  const loadTrialStatus = useCallback(async () => {
    try {
      const data = await usersApi.getTrialStatus();
      setTrialStatus(data);
    } catch (error) {
      console.error('Failed to load trial status:', error);
    } finally {
      setIsLoadingTrial(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadInviteData(), refreshUnreadCount(), refreshUnreadReplyCount(), loadTrialStatus()]);
    setRefreshing(false);
  }, [refreshUser, loadInviteData, refreshUnreadCount, refreshUnreadReplyCount, loadTrialStatus]);

  const handleShareInviteCode = async () => {
    if (!inviteData?.inviteCode) return;
    try {
      await Share.share({
        message: `用我的邀請碼加入 UBeep，我們各得 10 點！\n\n邀請碼：${inviteData.inviteCode}\n\n下載 App：https://ubeep.app/download`,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleCopyInviteCode = () => {
    if (!inviteData?.inviteCode) return;
    Alert.alert('已複製', `邀請碼 ${inviteData.inviteCode} 已複製到剪貼簿`);
  };

  const totalPoints = getTotalPoints(user);
  const isLowPoints = totalPoints < 5;

  // 顯示麥克風權限被拒絕的提示
  const showMicPermissionDeniedAlert = useCallback(() => {
    Alert.alert(
      '需要麥克風權限',
      '您之前拒絕了麥克風權限。\n\n請前往「設定」→「UBeep」→ 開啟「麥克風」權限，才能使用錄音功能。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '前往設定',
          onPress: async () => {
            if (Platform.OS === 'ios') {
              await Linking.openURL('app-settings:');
            } else {
              await Linking.openSettings();
            }
          },
        },
      ]
    );
  }, []);

  // 點擊快速錄音按鈕 - 先檢查權限再導航到錄音頁面
  const handleQuickRecordPress = useCallback(async () => {
    try {
      const { status: existingStatus, canAskAgain } = await Audio.getPermissionsAsync();

      if (existingStatus === 'granted') {
        // 已有權限，直接導航
        navigation.navigate('QuickRecord');
        return;
      }

      if (canAskAgain) {
        // 還可以詢問，嘗試請求權限
        const { status } = await Audio.requestPermissionsAsync();
        if (status === 'granted') {
          navigation.navigate('QuickRecord');
        }
        // 如果用戶拒絕，什麼都不做
      } else {
        // 之前已經拒絕過，無法再詢問，引導去設定
        showMicPermissionDeniedAlert();
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      Alert.alert('錯誤', '無法檢查麥克風權限');
    }
  }, [navigation, showMicPermissionDeniedAlert]);


  return (
    <View style={styles.container}>
      {/* Header with safe area */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {user?.nickname && (
                <Text style={styles.headerLabel}>暱稱</Text>
              )}
              <View style={styles.userInfo}>
                <VehicleIcon
                  userType={user?.userType}
                  vehicleType={user?.vehicleType}
                  size={16}
                  color={colors.foreground}
                />
                {user?.nickname ? (
                  <View style={styles.userTextContainer}>
                    <Text style={styles.userName}>{user.nickname}</Text>
                    {user.licensePlate && (
                      <Text style={styles.licensePlate}>
                        {displayLicensePlate(user.licensePlate)}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.userName}>
                    {user?.userType === 'pedestrian'
                      ? '行人用戶'
                      : user?.licensePlate
                      ? displayLicensePlate(user.licensePlate)
                      : ''}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={colors.muted.foreground}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 狀態列：點數 + 試用期 */}
        <View style={styles.statusRow}>
          {/* 點數顯示 */}
          <TouchableOpacity
            style={[
              styles.pointsChip,
              isLowPoints && styles.pointsChipWarning,
            ]}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLowPoints ? 'alert-circle' : 'diamond'}
              size={16}
              color={isLowPoints ? colors.destructive.DEFAULT : colors.primary.DEFAULT}
            />
            <Text style={[
              styles.pointsChipText,
              isLowPoints && styles.pointsChipTextWarning,
            ]}>
              {totalPoints} 點
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.muted.foreground}
            />
          </TouchableOpacity>

          {/* 試用期顯示 */}
          {trialStatus?.isInTrial && (
            <View style={styles.trialChip}>
              <Ionicons
                name="time"
                size={14}
                color="#10B981"
              />
              <Text style={styles.trialChipText}>
                試用期 {trialStatus.daysRemaining} 天
              </Text>
            </View>
          )}
        </View>

        {/* 點數不足警告 */}
        {isLowPoints && (
          <TouchableOpacity
            style={styles.lowPointsBanner}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.8}
          >
            <View style={styles.lowPointsBannerContent}>
              <Ionicons name="alert-circle" size={18} color={colors.destructive.DEFAULT} />
              <Text style={styles.lowPointsBannerText}>點數即將用完，點此儲值</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.destructive.DEFAULT} />
          </TouchableOpacity>
        )}

        {/* 發送提醒區塊 */}
        <View style={styles.sendSection}>
          <Text style={styles.sendSectionTitle}>發送提醒</Text>
          <Text style={styles.sendSectionSubtitle}>一次性提醒，不開啟聊天</Text>

          <View style={styles.sendButtonsRow}>
            {/* 快速錄音 */}
            <TouchableOpacity
              style={[
                styles.sendOptionCard,
                styles.sendOptionPrimary,
                { backgroundColor: colors.primary.DEFAULT },
                isLowPoints && totalPoints < 1 && styles.sendButtonDisabled,
              ]}
              onPress={handleQuickRecordPress}
              disabled={isLowPoints && totalPoints < 1}
              activeOpacity={0.8}
            >
              <View style={[styles.sendOptionIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="mic" size={28} color={colors.primary.foreground} />
              </View>
              <Text style={[styles.sendOptionTitle, { color: colors.primary.foreground }]}>
                快速錄音
              </Text>
              <Text style={[styles.sendOptionDesc, { color: colors.primary.foreground, opacity: 0.85 }]}>
                說出車牌和事件{'\n'}AI 自動辨識
              </Text>
            </TouchableOpacity>

            {/* 手動輸入 */}
            <TouchableOpacity
              style={[
                styles.sendOptionCard,
                { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid },
                isLowPoints && totalPoints < 1 && styles.sendButtonDisabled,
              ]}
              onPress={() => navigation.navigate('Send')}
              disabled={isLowPoints && totalPoints < 1}
              activeOpacity={0.8}
            >
              <View style={[styles.sendOptionIconContainer, { backgroundColor: `${colors.primary.DEFAULT}15` }]}>
                <Ionicons name="create-outline" size={28} color={colors.primary.DEFAULT} />
              </View>
              <Text style={[styles.sendOptionTitle, { color: colors.foreground }]}>
                手動輸入
              </Text>
              <Text style={[styles.sendOptionDesc, { color: colors.muted.foreground }]}>
                輸入車牌號碼{'\n'}選擇提醒類型
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pedestrian Mode Notice */}
        {user?.userType === 'pedestrian' && (
          <View style={styles.pedestrianCard}>
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.muted.foreground}
            />
            <View style={styles.pedestrianTextContainer}>
              <Text style={styles.pedestrianTitle}>行人用戶模式</Text>
              <Text style={styles.pedestrianSubtitle}>
                你可以發送提醒給汽車/機車駕駛{'\n'}
                但無法收到提醒（因為沒有車牌號碼）
              </Text>
            </View>
          </View>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Inbox')}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.muted.foreground}
              />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.quickActionText}>提醒訊息</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Sent')}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons
                name="time-outline"
                size={20}
                color={colors.muted.foreground}
              />
              {hasUnreadReplies && (
                <View style={styles.replyBadge} />
              )}
            </View>
            <Text style={styles.quickActionText}>發送記錄</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Wallet')}
          >
            <Ionicons
              name="wallet-outline"
              size={20}
              color={colors.muted.foreground}
            />
            <Text style={styles.quickActionText}>點數</Text>
          </TouchableOpacity>
        </View>

        {/* Invite Card */}
        <View style={styles.inviteCard}>
          <View style={styles.inviteHeader}>
            <View style={styles.inviteIconContainer}>
              <Ionicons
                name="gift-outline"
                size={20}
                color={colors.primary.DEFAULT}
              />
            </View>
            <View style={styles.inviteHeaderText}>
              <Text style={styles.inviteTitle}>邀請好友賺點數</Text>
              <Text style={styles.inviteReward}>你我各得 10 點！</Text>
            </View>
          </View>

          {isLoadingInvite ? (
            <View style={styles.inviteLoadingContainer}>
              <ActivityIndicator color={colors.primary.DEFAULT} size="small" />
              <Text style={styles.inviteLoadingText}>載入中...</Text>
            </View>
          ) : inviteData ? (
            <View style={styles.inviteContent}>
              {/* Invite code display */}
              <View style={styles.inviteCodeCard}>
                <Text style={styles.inviteCodeLabel}>我的邀請碼</Text>
                <Text style={styles.inviteCodeText}>{inviteData.inviteCode}</Text>
              </View>

              {/* Copy and share buttons */}
              <View style={styles.inviteButtonsRow}>
                <TouchableOpacity
                  style={styles.inviteOutlineButton}
                  onPress={handleCopyInviteCode}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={16} color={colors.foreground} />
                  <Text style={styles.inviteOutlineButtonText}>複製邀請碼</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.invitePrimaryButton}
                  onPress={handleShareInviteCode}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={16} color={colors.primary.foreground} />
                  <Text style={styles.invitePrimaryButtonText}>分享給好友</Text>
                </TouchableOpacity>
              </View>

              {/* Invite stats */}
              {inviteData.inviteCount > 0 && (
                <View style={styles.inviteStats}>
                  <Ionicons name="people-outline" size={16} color={colors.primary.DEFAULT} />
                  <Text style={styles.inviteStatsText}>
                    已邀請 <Text style={styles.inviteStatsBold}>{inviteData.inviteCount}</Text> 人，獲得{' '}
                    <Text style={styles.inviteStatsHighlight}>{inviteData.totalRewards}</Text> 點
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.inviteLoadingContainer}>
              <Text style={styles.inviteLoadingText}>無法載入邀請碼</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
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
    headerLeft: {
      flex: 1,
    },
    headerLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
      marginBottom: spacing[0.5],
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    userTextContainer: {
      flexDirection: 'column',
    },
    userName: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },
    licensePlate: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
      fontFamily: 'monospace',
    },
    settingsButton: {
      padding: spacing[2],
      borderRadius: borderRadius.lg,
    },

    // Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing[6],
      gap: spacing[6],
    },

    // Status Row (Points + Trial)
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      flexWrap: 'wrap',
    },
    pointsChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1.5],
      backgroundColor: colors.card.DEFAULT,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
    },
    pointsChipWarning: {
      borderColor: `${colors.destructive.DEFAULT}40`,
      backgroundColor: `${colors.destructive.DEFAULT}08`,
    },
    pointsChipText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold as any,
      color: colors.foreground,
    },
    pointsChipTextWarning: {
      color: colors.destructive.DEFAULT,
    },
    trialChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1.5],
    },
    trialChipText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium as any,
      color: '#10B981',
    },
    lowPointsBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: `${colors.destructive.DEFAULT}10`,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
    },
    lowPointsBannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    lowPointsBannerText: {
      fontSize: typography.fontSize.sm,
      color: colors.destructive.DEFAULT,
      fontWeight: typography.fontWeight.medium as any,
    },

    // Send Section
    sendSection: {
      gap: spacing[3],
    },
    sendSectionTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold as any,
      color: colors.foreground,
    },
    sendSectionSubtitle: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
      marginTop: -spacing[2],
    },
    sendButtonsRow: {
      flexDirection: 'row',
      gap: spacing[3],
    },
    sendOptionCard: {
      flex: 1,
      borderRadius: borderRadius.xl,
      padding: spacing[4],
      borderWidth: 1,
      alignItems: 'center',
      gap: spacing[2],
      ...shadows.sm,
    },
    sendOptionPrimary: {
      borderWidth: 0,
    },
    sendOptionIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing[1],
    },
    sendOptionTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold as any,
    },
    sendOptionDesc: {
      fontSize: typography.fontSize.xs,
      textAlign: 'center',
      lineHeight: typography.fontSize.xs * 1.5,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },

    // Pedestrian Card
    pedestrianCard: {
      backgroundColor: isDark ? `${colors.muted.DEFAULT}` : `${colors.muted.DEFAULT}30`,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      padding: spacing[4],
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[3],
    },
    pedestrianTextContainer: {
      flex: 1,
      gap: spacing[1],
    },
    pedestrianTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },
    pedestrianSubtitle: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
      lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
    },

    // Quick Actions Grid
    quickActionsGrid: {
      flexDirection: 'row',
      gap: spacing[3],
    },
    quickActionButton: {
      flex: 1,
      backgroundColor: colors.card.DEFAULT,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      paddingVertical: spacing[5],
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
    },
    quickActionIconContainer: {
      position: 'relative',
    },
    quickActionText: {
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
    },
    unreadBadge: {
      position: 'absolute',
      top: -6,
      right: -10,
      backgroundColor: colors.destructive.DEFAULT,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[1],
    },
    unreadBadgeText: {
      fontSize: 10,
      fontWeight: typography.fontWeight.bold as any,
      color: '#FFFFFF',
    },
    replyBadge: {
      position: 'absolute',
      top: -2,
      right: -4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.destructive.DEFAULT,
    },

    // Invite Card
    inviteCard: {
      backgroundColor: colors.primary.soft,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: `${colors.primary.DEFAULT}20`,
      padding: spacing[4],
    },
    inviteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      marginBottom: spacing[3],
    },
    inviteIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary.DEFAULT}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inviteHeaderText: {
      flex: 1,
    },
    inviteTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },
    inviteReward: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.DEFAULT,
    },
    inviteLoadingContainer: {
      alignItems: 'center',
      paddingVertical: spacing[2],
      gap: spacing[2],
    },
    inviteLoadingText: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
    },
    inviteContent: {
      gap: spacing[3],
    },
    inviteCodeCard: {
      backgroundColor: isDark ? colors.card.DEFAULT : 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1,
      borderColor: colors.borderSolid,
      borderRadius: borderRadius.lg,
      padding: spacing[3],
      alignItems: 'center',
    },
    inviteCodeLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
      marginBottom: spacing[1],
    },
    inviteCodeText: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold as any,
      fontFamily: 'monospace',
      letterSpacing: 4,
      color: colors.foreground,
    },
    inviteButtonsRow: {
      flexDirection: 'row',
      gap: spacing[2],
    },
    inviteOutlineButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[1.5],
      backgroundColor: isDark ? colors.card.DEFAULT : 'rgba(255, 255, 255, 0.5)',
      borderWidth: 1,
      borderColor: colors.borderSolid,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing[2.5],
    },
    inviteOutlineButtonText: {
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
    },
    invitePrimaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[1.5],
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing[2.5],
    },
    invitePrimaryButtonText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.foreground,
    },
    inviteStats: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      paddingTop: spacing[2],
      borderTopWidth: 1,
      borderTopColor: `${colors.primary.DEFAULT}10`,
    },
    inviteStatsText: {
      fontSize: typography.fontSize.xs,
      color: colors.foreground,
    },
    inviteStatsBold: {
      fontWeight: typography.fontWeight.medium as any,
    },
    inviteStatsHighlight: {
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.DEFAULT,
    },

  });
