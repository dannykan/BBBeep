/**
 * Home Screen
 * 首頁 - Warm Blue 設計
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import VehicleIcon from '../../components/VehicleIcon';
import GradientBackground from '../../components/GradientBackground';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { getTotalPoints, displayLicensePlate, inviteApi, usersApi, appContentApi } from '@bbbeeep/shared';
import type { InviteCodeResponse, TrialStatusResponse } from '@bbbeeep/shared';
import { useUnread } from '../../context/UnreadContext';
import { useUnreadReply } from '../../context/UnreadReplyContext';
import { useDraft } from '../../context/DraftContext';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const { colors, isDark } = useTheme();
  const { unreadCount, refreshUnreadCount } = useUnread();
  const { unreadReplyCount, refreshUnreadReplyCount } = useUnreadReply();
  const { pendingCount, fetchPendingCount } = useDraft();
  const [refreshing, setRefreshing] = useState(false);
  const [inviteData, setInviteData] = useState<InviteCodeResponse | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [trialStatus, setTrialStatus] = useState<TrialStatusResponse | null>(null);
  const [isLoadingTrial, setIsLoadingTrial] = useState(true);

  // App content (dynamic titles)
  const [heroTitle, setHeroTitle] = useState('讓路上多一點善意 💙');
  const [heroSubtitle, setHeroSubtitle] = useState('透過車牌發送善意提醒，讓駕駛更安全');

  useEffect(() => {
    appContentApi.getContent()
      .then((content) => {
        if (content.homeHeroTitle) setHeroTitle(content.homeHeroTitle);
        if (content.homeHeroSubtitle) setHeroSubtitle(content.homeHeroSubtitle);
      })
      .catch((error) => {
        console.log('Failed to load app content, using defaults:', error);
      });
  }, []);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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

  // 當畫面獲得焦點時刷新用戶資料（包含點數）
  useFocusEffect(
    useCallback(() => {
      refreshUser();
      loadInviteData();
      loadTrialStatus();
      refreshUnreadCount();
      refreshUnreadReplyCount();
      fetchPendingCount();
    }, [refreshUser, loadInviteData, loadTrialStatus, refreshUnreadCount, refreshUnreadReplyCount, fetchPendingCount])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadInviteData(), refreshUnreadCount(), refreshUnreadReplyCount(), loadTrialStatus(), fetchPendingCount()]);
    setRefreshing(false);
  }, [refreshUser, loadInviteData, refreshUnreadCount, refreshUnreadReplyCount, loadTrialStatus, fetchPendingCount]);

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
        navigation.navigate('QuickRecord');
        return;
      }

      if (canAskAgain) {
        const { status } = await Audio.requestPermissionsAsync();
        if (status === 'granted') {
          navigation.navigate('QuickRecord');
        }
      } else {
        showMicPermissionDeniedAlert();
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      Alert.alert('錯誤', '無法檢查麥克風權限');
    }
  }, [navigation, showMicPermissionDeniedAlert]);


  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          {/* Left: Logo and Brand */}
          <View style={styles.headerLeft}>
            <Image
              source={require('../../../assets/ubeep-logo.png')}
              style={styles.logo}
            />
            <Text style={styles.brandText}>UBeep</Text>
          </View>

          {/* Right: Trial and Points */}
          <View style={styles.headerRight}>
            {/* Trial Badge */}
            {trialStatus?.isInTrial && trialStatus.daysRemaining > 0 && (
              <View style={styles.trialBadge}>
                <Ionicons name="time-outline" size={14} color="#8B5CF6" />
                <Text style={styles.trialText}>試用 {trialStatus.daysRemaining} 天</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.pointsBadge}
              onPress={() => navigation.navigate('Wallet')}
              activeOpacity={0.7}
            >
              <Ionicons name="wallet" size={18} color="#F59E0B" />
              <Text style={styles.pointsText}>{totalPoints}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Section */}
        <GradientBackground
          colors={[colors.primary.DEFAULT, '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>

          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.heroButtonWhite}
              onPress={() => navigation.navigate('Send')}
              disabled={isLowPoints && totalPoints < 1}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary.DEFAULT} />
              <Text style={styles.heroButtonWhiteText}>手動輸入</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroButtonWarm}
              onPress={handleQuickRecordPress}
              disabled={isLowPoints && totalPoints < 1}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={20} color="#FFFFFF" />
              <Text style={styles.heroButtonWarmText}>語音錄製</Text>
            </TouchableOpacity>
          </View>
        </GradientBackground>

        {/* User Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <VehicleIcon
              userType={user?.userType}
              vehicleType={user?.vehicleType}
              size={28}
              color={colors.primary.DEFAULT}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userNickname}>{user?.nickname || '用戶'}</Text>
            <View style={styles.userPlateRow}>
              <View style={styles.userTypeBadge}>
                <Text style={styles.userTypeBadgeText}>
                  {user?.userType === 'pedestrian' ? '行人' : user?.vehicleType === 'motorcycle' ? '機車' : '汽車'}
                </Text>
              </View>
              {user?.licensePlate && (
                <Text style={styles.userPlateText}>{displayLicensePlate(user.licensePlate)}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.userEditButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="pencil" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Quick Access Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>快速存取</Text>
          <View style={styles.quickAccessGrid}>
            {/* Sent Card */}
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => navigation.navigate('Sent')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary.bg }]}>
                <Ionicons name="paper-plane" size={18} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.quickAccessTextGroup}>
                <Text style={styles.quickAccessLabel}>發送紀錄</Text>
                {unreadReplyCount > 0 && (
                  <View style={styles.quickAccessBadge}>
                    <Text style={styles.quickAccessBadgeText}>{unreadReplyCount > 99 ? '99+' : unreadReplyCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Inbox Card */}
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => navigation.navigate('Inbox')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#FEF3C7' }]}>
                <Image
                  source={require('../../../assets/inbox-icon-orange.png')}
                  style={{ width: 38, height: 38 }}
                />
              </View>
              <View style={styles.quickAccessTextGroup}>
                <Text style={styles.quickAccessLabel}>提醒訊息</Text>
                {unreadCount > 0 && (
                  <View style={[styles.quickAccessBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.quickAccessBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice Drafts Card */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.draftsCard}
            onPress={() => navigation.navigate('Drafts')}
            activeOpacity={0.7}
          >
            <View style={styles.draftsLeft}>
              <View style={styles.draftsIcon}>
                <Ionicons name="mic" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.draftsInfo}>
                <Text style={styles.draftsLabel}>語音草稿</Text>
                <Text style={styles.draftsCount}>{pendingCount} 則待處理</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}

        {/* Invite Card */}
        <GradientBackground
          colors={['#DBEAFE', '#BFDBFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.inviteCard}
        >
          <Text style={styles.inviteTitle}>邀請好友 🎁</Text>
          <Text style={styles.inviteSubtitle}>每成功邀請一位好友，雙方各獲得 10 點！</Text>

          {isLoadingInvite ? (
            <ActivityIndicator color={colors.primary.DEFAULT} size="small" style={{ marginTop: 12 }} />
          ) : inviteData ? (
            <>
              {/* Invite Code Display */}
              <View style={styles.inviteCodeContainer}>
                <Text style={styles.inviteCodeLabel}>你的邀請碼</Text>
                <Text style={styles.inviteCode}>{inviteData.inviteCode}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.inviteButtonsRow}>
                <TouchableOpacity
                  style={styles.inviteButtonPrimary}
                  onPress={async () => {
                    if (inviteData?.inviteCode) {
                      try {
                        await Share.share({ message: inviteData.inviteCode });
                      } catch (error) {
                        console.error('Failed to copy:', error);
                      }
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.inviteButtonText}>複製邀請碼</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.inviteButtonSecondary}
                  onPress={handleShareInviteCode}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={16} color={colors.primary.DEFAULT} />
                  <Text style={styles.inviteButtonSecondaryText}>分享好友</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </GradientBackground>

        {/* Pedestrian Mode Notice */}
        {user?.userType === 'pedestrian' && (
          <View style={styles.pedestrianCard}>
            <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
            <View style={styles.pedestrianTextContainer}>
              <Text style={styles.pedestrianTitle}>行人用戶模式</Text>
              <Text style={styles.pedestrianSubtitle}>
                你可以發送提醒給汽車/機車駕駛，但無法收到提醒
              </Text>
            </View>
          </View>
        )}
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
    headerSafeArea: {
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logo: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    brandText: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary.DEFAULT,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    trialBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#F3E8FF',
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    trialText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#8B5CF6',
    },
    pointsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#FFFBEB',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    pointsText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#F59E0B',
    },

    // Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 16,
      paddingBottom: 120,
      gap: 24,
    },

    // Hero Section
    heroSection: {
      borderRadius: 24,
      padding: 24,
      gap: 16,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    heroSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      lineHeight: 21,
    },
    heroButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    heroButtonWhite: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      height: 52,
    },
    heroButtonWhiteText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
    },
    heroButtonWarm: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#F59E0B',
      borderRadius: 16,
      height: 52,
    },
    heroButtonWarmText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // User Profile Card
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userInfo: {
      flex: 1,
      gap: 4,
    },
    userNickname: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
    },
    userPlateRow: {
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
    userPlateText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.secondary,
      letterSpacing: 1,
    },
    userEditButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.card.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Quick Access Section
    sectionContainer: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
    },
    quickAccessGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    quickAccessCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      padding: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickAccessIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickAccessTextGroup: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    quickAccessLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    quickAccessBadge: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: 'center',
    },
    quickAccessBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // Drafts Card
    draftsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    draftsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    draftsIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#EDE9FE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    draftsInfo: {
      gap: 2,
    },
    draftsLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    draftsCount: {
      fontSize: 12,
      color: colors.text.secondary,
    },

    // Invite Card
    inviteCard: {
      borderRadius: 20,
      padding: 20,
      paddingBottom: 20,
      gap: 16,
    },
    inviteTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1E40AF',
    },
    inviteSubtitle: {
      fontSize: 13,
      color: '#1D4ED8',
      lineHeight: 18,
    },
    inviteCodeContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 6,
    },
    inviteCodeLabel: {
      fontSize: 12,
      color: '#64748B',
      fontWeight: '500',
    },
    inviteCode: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary.dark,
      letterSpacing: 2,
    },
    inviteButtonsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inviteButtonPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    inviteButtonSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.primary.DEFAULT,
    },
    inviteButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    inviteButtonSecondaryText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
    },

    // Pedestrian Card
    pedestrianCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pedestrianTextContainer: {
      flex: 1,
      gap: 4,
    },
    pedestrianTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    pedestrianSubtitle: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
    },
  });
