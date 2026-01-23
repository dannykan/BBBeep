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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import VehicleIcon from '../../components/VehicleIcon';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { getTotalPoints, displayLicensePlate, inviteApi, usersApi } from '@bbbeeep/shared';
import type { InviteCodeResponse, TrialStatusResponse } from '@bbbeeep/shared';
import { useUnread } from '../../context/UnreadContext';
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
  const [refreshing, setRefreshing] = useState(false);
  const [inviteData, setInviteData] = useState<InviteCodeResponse | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [trialStatus, setTrialStatus] = useState<TrialStatusResponse | null>(null);
  const [isLoadingTrial, setIsLoadingTrial] = useState(true);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    loadInviteData();
    loadTrialStatus();
  }, []);

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
    await Promise.all([refreshUser(), loadInviteData(), refreshUnreadCount(), loadTrialStatus()]);
    setRefreshing(false);
  }, [refreshUser, loadInviteData, refreshUnreadCount, loadTrialStatus]);

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
        {/* Points Card */}
        <View style={styles.card}>
          <View style={styles.pointsRow}>
            <View>
              <Text style={styles.pointsLabel}>剩餘點數</Text>
              <Text style={styles.pointsValue}>{totalPoints}</Text>
            </View>
            <TouchableOpacity
              style={styles.walletButton}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Ionicons
                name="wallet-outline"
                size={16}
                color={colors.foreground}
              />
              <Text style={styles.walletButtonText}>儲值</Text>
            </TouchableOpacity>
          </View>

          {isLowPoints && (
            <View style={styles.lowPointsWarning}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.destructive.DEFAULT}
              />
              <Text style={styles.lowPointsText}>
                點數即將用完，建議儲值以繼續使用
              </Text>
            </View>
          )}
        </View>

        {/* Trial Period Card */}
        {trialStatus?.isInTrial && (
          <View style={styles.trialCard}>
            <View style={styles.trialHeader}>
              <View style={styles.trialIconContainer}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={colors.secondary?.DEFAULT || '#10B981'}
                />
              </View>
              <View style={styles.trialHeaderText}>
                <Text style={styles.trialTitle}>試用期體驗中</Text>
                <Text style={styles.trialSubtitle}>
                  享有 {trialStatus.trialConfig.initialPoints} 點免費體驗
                </Text>
              </View>
            </View>
            <View style={styles.trialCountdown}>
              <View style={styles.trialCountdownBox}>
                <Text style={styles.trialCountdownNumber}>
                  {trialStatus.daysRemaining}
                </Text>
                <Text style={styles.trialCountdownLabel}>天</Text>
              </View>
              <Text style={styles.trialCountdownText}>剩餘體驗時間</Text>
            </View>
            <View style={styles.trialInfo}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={colors.muted.foreground}
              />
              <Text style={styles.trialInfoText}>
                試用結束後將贈送 {trialStatus.trialConfig.oneTimeBonusAfterTrial} 點
              </Text>
            </View>
          </View>
        )}

        {/* Trial Ended Notice */}
        {trialStatus && !trialStatus.isInTrial && trialStatus.trialStartDate && (
          <View style={styles.trialEndedCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={colors.muted.foreground}
            />
            <Text style={styles.trialEndedText}>
              試用期已結束，感謝您的體驗！
            </Text>
          </View>
        )}

        {/* Send Reminder Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            isLowPoints && totalPoints < 1 && styles.sendButtonDisabled,
          ]}
          onPress={() => navigation.navigate('Send')}
          disabled={isLowPoints && totalPoints < 1}
          activeOpacity={0.8}
        >
          <View style={styles.sendButtonContent}>
            <Ionicons name="send" size={24} color={colors.primary.foreground} />
            <View style={styles.sendButtonTextContainer}>
              <Text style={styles.sendButtonTitle}>發送提醒</Text>
              <Text style={styles.sendButtonSubtitle}>一次性、不開啟聊天</Text>
            </View>
          </View>
        </TouchableOpacity>

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

        {/* Info Notice */}
        <View style={styles.infoNotice}>
          <Text style={styles.infoNoticeText}>
            提醒送出後不會開啟聊天{'\n'}
            所有提醒皆為一次性
          </Text>
        </View>

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
            <Ionicons
              name="time-outline"
              size={20}
              color={colors.muted.foreground}
            />
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

    // Points Card
    card: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      padding: spacing[5],
    },
    pointsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pointsLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
      marginBottom: spacing[1.5],
    },
    pointsValue: {
      fontSize: typography.fontSize['5xl'],
      fontWeight: typography.fontWeight.bold as any,
      color: colors.foreground,
    },
    walletButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1.5],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      backgroundColor: colors.card.DEFAULT,
    },
    walletButtonText: {
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
    },
    lowPointsWarning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
      marginTop: spacing[4],
      paddingTop: spacing[4],
      borderTopWidth: 1,
      borderTopColor: colors.borderSolid,
    },
    lowPointsText: {
      flex: 1,
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
      lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
    },

    // Trial Card
    trialCard: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.06)',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.15)',
      padding: spacing[4],
    },
    trialHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      marginBottom: spacing[3],
    },
    trialIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${'#10B981'}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trialHeaderText: {
      flex: 1,
    },
    trialTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },
    trialSubtitle: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },
    trialCountdown: {
      alignItems: 'center',
      marginBottom: spacing[3],
    },
    trialCountdownBox: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing[1],
    },
    trialCountdownNumber: {
      fontSize: typography.fontSize['4xl'],
      fontWeight: typography.fontWeight.bold as any,
      color: '#10B981',
    },
    trialCountdownLabel: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium as any,
      color: '#10B981',
    },
    trialCountdownText: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
      marginTop: spacing[1],
    },
    trialInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[1.5],
      paddingTop: spacing[3],
      borderTopWidth: 1,
      borderTopColor: `${'#10B981'}15`,
    },
    trialInfoText: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },
    trialEndedCard: {
      backgroundColor: isDark ? colors.muted.DEFAULT : `${colors.muted.DEFAULT}30`,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    trialEndedText: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },

    // Send Button
    sendButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: borderRadius.xl,
      padding: spacing[5],
      ...shadows.sm,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[3],
    },
    sendButtonTextContainer: {
      alignItems: 'flex-start',
    },
    sendButtonTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.foreground,
    },
    sendButtonSubtitle: {
      fontSize: typography.fontSize.xs,
      color: colors.primary.foreground,
      opacity: 0.8,
      marginTop: spacing[0.5],
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

    // Info Notice
    infoNotice: {
      backgroundColor: isDark ? `${colors.muted.DEFAULT}` : `${colors.muted.DEFAULT}30`,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    infoNoticeText: {
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
