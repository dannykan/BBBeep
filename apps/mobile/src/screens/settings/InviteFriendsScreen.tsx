/**
 * Invite Friends Screen
 * 邀請好友頁面 - Warm Blue 設計
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { inviteApi, InviteCodeResponse } from '@bbbeeep/shared';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import GradientBackground from '../../components/GradientBackground';

export default function InviteFriendsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const [inviteData, setInviteData] = useState<InviteCodeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputCode, setInputCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadInviteCode();
  }, []);

  const loadInviteCode = async () => {
    try {
      const data = await inviteApi.getMyCode();
      setInviteData(data);
    } catch (error) {
      console.error('Failed to load invite code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const inviteCode = inviteData?.inviteCode || 'XXXXXX';
  const inviteLink = `https://ubeep.app/invite/${inviteCode}`;

  const handleCopyCode = async () => {
    try {
      await Share.share({ message: inviteCode });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `用我的邀請碼加入 UBeep，我們各得 10 點！\n\n邀請碼：${inviteCode}\n\n下載 App：https://ubeep.app/download`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleApplyCode = async () => {
    if (!inputCode.trim()) {
      Alert.alert('請輸入邀請碼');
      return;
    }

    // Check if user is trying to use their own code
    if (inputCode.trim().toUpperCase() === inviteCode.toUpperCase()) {
      Alert.alert('無法使用', '不能使用自己的邀請碼');
      return;
    }

    setIsApplying(true);
    try {
      const result = await inviteApi.applyCode(inputCode.trim().toUpperCase());
      if (result.success) {
        Alert.alert(
          '綁定成功！',
          `已成功綁定 ${result.inviterNickname} 的邀請碼，你獲得了 ${result.inviteeReward} 點獎勵！`,
          [{ text: '太棒了', onPress: () => refreshUser() }]
        );
        setInputCode('');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || '綁定失敗，請確認邀請碼是否正確';
      Alert.alert('綁定失敗', message);
    } finally {
      setIsApplying(false);
    }
  };

  // Check if user has already used an invite code
  const hasUsedInviteCode = !!user?.invitedBy;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
                <Text style={styles.backText}>返回</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>邀請好友</Text>
              <View style={styles.headerSpacer} />
            </View>
          </SafeAreaView>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary.DEFAULT} />
        </View>
      </View>
    );
  }

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
              <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>邀請好友</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card - Same as HomeScreen */}
        <GradientBackground
          colors={['#DBEAFE', '#BFDBFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIconContainer}>
            <Ionicons name="gift" size={32} color="#F59E0B" />
          </View>
          <Text style={styles.heroTitle}>邀請好友，一起賺點數 🎁</Text>
          <Text style={styles.heroSubtitle}>
            每成功邀請一位好友，雙方各獲得 10 點！
          </Text>

          {/* Invite Code Display */}
          <View style={styles.inviteCodeContainer}>
            <Text style={styles.inviteCodeLabel}>你的邀請碼</Text>
            <Text style={styles.inviteCode}>{inviteCode}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.inviteButtonsRow}>
            <TouchableOpacity
              style={styles.inviteButtonPrimary}
              onPress={handleCopyCode}
              activeOpacity={0.8}
            >
              <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
              <Text style={styles.inviteButtonText}>複製邀請碼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inviteButtonSecondary}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.inviteButtonSecondaryText}>分享好友</Text>
            </TouchableOpacity>
          </View>
        </GradientBackground>

        {/* Enter Friend's Invite Code Section */}
        {!hasUsedInviteCode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>輸入好友邀請碼</Text>
            <View style={styles.inputCard}>
              <Text style={styles.inputHint}>
                輸入好友的邀請碼，綁定成功後你和好友各獲得 10 點！
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="輸入邀請碼或車牌"
                  placeholderTextColor={colors.text.secondary}
                  value={inputCode}
                  onChangeText={(text) => setInputCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  autoCapitalize="characters"
                  maxLength={8}
                />
                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    (!inputCode.trim() || isApplying) && styles.applyButtonDisabled,
                  ]}
                  onPress={handleApplyCode}
                  disabled={!inputCode.trim() || isApplying}
                  activeOpacity={0.8}
                >
                  {isApplying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.applyButtonText}>綁定</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Already used invite code */}
        {hasUsedInviteCode && (
          <View style={styles.usedCodeCard}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={styles.usedCodeText}>
              你已綁定 {user?.invitedBy?.nickname || '好友'} 的邀請碼
            </Text>
          </View>
        )}

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>如何運作</Text>
          <View style={styles.stepsCard}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>分享邀請碼</Text>
                <Text style={styles.stepDescription}>
                  將你的邀請碼分享給朋友
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>好友綁定邀請碼</Text>
                <Text style={styles.stepDescription}>
                  好友在這個頁面輸入並綁定邀請碼
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>雙方獲得點數</Text>
                <Text style={styles.stepDescription}>
                  你和好友各獲得 10 點獎勵
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{inviteData?.inviteCount || 0}</Text>
            <Text style={styles.statLabel}>已邀請人數</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{inviteData?.totalRewards || 0}</Text>
            <Text style={styles.statLabel}>獲得點數</Text>
          </View>
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

    // Loading
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Scroll Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      gap: 20,
    },

    // Hero Card - Same as HomeScreen inviteCard
    heroCard: {
      borderRadius: 20,
      padding: 20,
      gap: 12,
      alignItems: 'center',
    },
    heroIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#FEF3C7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1E40AF',
    },
    heroSubtitle: {
      fontSize: 13,
      color: '#1D4ED8',
      textAlign: 'center',
      lineHeight: 18,
    },
    inviteCodeContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      gap: 6,
      width: '100%',
    },
    inviteCodeLabel: {
      fontSize: 12,
      color: '#64748B',
      fontWeight: '500',
    },
    inviteCode: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.primary.dark,
      letterSpacing: 3,
    },
    inviteButtonsRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
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

    // Section
    section: {
      gap: 10,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      paddingLeft: 4,
    },

    // Input Card
    inputCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    inputHint: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 12,
    },
    codeInput: {
      flex: 1,
      height: 48,
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      letterSpacing: 2,
    },
    applyButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 12,
      paddingHorizontal: 20,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyButtonDisabled: {
      opacity: 0.5,
    },
    applyButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // Used Code Card
    usedCodeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#DCFCE7',
      borderRadius: 12,
      padding: 14,
    },
    usedCodeText: {
      fontSize: 14,
      color: '#166534',
      fontWeight: '500',
    },

    // Steps Card
    stepsCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 16,
    },
    stepItem: {
      flexDirection: 'row',
      gap: 12,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    stepContent: {
      flex: 1,
      gap: 2,
    },
    stepTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    stepDescription: {
      fontSize: 12,
      color: colors.text.secondary,
    },

    // Stats Card
    statsCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary.DEFAULT,
    },
    statLabel: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
    },
  });
