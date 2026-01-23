/**
 * Invite Friends Screen
 * 邀請好友頁面
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { inviteApi, InviteCodeResponse } from '@bbbeeep/shared';
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from '../../theme';

export default function InviteFriendsScreen() {
  const navigation = useNavigation<any>();
  const [inviteData, setInviteData] = useState<InviteCodeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const inviteLink = `https://bbbeeep.com/invite/${inviteCode}`;

  const handleCopyCode = async () => {
    Alert.alert('邀請碼', inviteCode, [{ text: '確定' }]);
  };

  const handleCopyLink = async () => {
    Alert.alert('邀請連結', inviteLink, [{ text: '確定' }]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `我在用 BBBeep 路上提醒平台，用禮貌的方式提醒其他駕駛。使用我的邀請碼 ${inviteCode} 註冊，你我各得 10 點！\n\n${inviteLink}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

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
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={colors.muted.foreground}
                />
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
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.muted.foreground}
              />
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
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="gift" size={48} color={colors.primary.DEFAULT} />
          </View>
          <Text style={styles.heroTitle}>邀請好友，一起賺點數</Text>
          <Text style={styles.heroSubtitle}>
            每成功邀請一位好友，你和好友各得 {inviteData?.inviterReward || 10} 點！
          </Text>
        </View>

        {/* Invite Code Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>你的邀請碼</Text>
          <View style={styles.codeCard}>
            <Text style={styles.codeText}>{inviteCode}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCode}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={18} color={colors.primary.DEFAULT} />
              <Text style={styles.copyButtonText}>複製</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Invite Link Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>邀請連結</Text>
          <View style={styles.linkCard}>
            <Text style={styles.linkText} numberOfLines={1}>
              {inviteLink}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyLink}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={18} color={colors.primary.DEFAULT} />
              <Text style={styles.copyButtonText}>複製</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Ionicons name="share-outline" size={20} color={colors.primary.foreground} />
          <Text style={styles.shareButtonText}>分享給好友</Text>
        </TouchableOpacity>

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
                  將你的邀請碼或連結分享給朋友
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>好友註冊</Text>
                <Text style={styles.stepDescription}>
                  好友使用邀請碼完成註冊
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
                  你和好友各獲得 {inviteData?.inviterReward || 10} 點獎勵
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

const styles = StyleSheet.create({
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
    padding: spacing[6],
    gap: spacing[5],
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.primary.soft,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary.DEFAULT}20`,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary.DEFAULT}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  heroTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  heroSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    textAlign: 'center',
  },

  // Section
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

  // Code Card
  codeCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: colors.primary.DEFAULT,
    letterSpacing: 4,
    fontFamily: 'monospace',
  },

  // Link Card
  linkCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  linkText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },

  // Copy Button
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary.soft,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  copyButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.DEFAULT,
    fontWeight: typography.fontWeight.medium as any,
  },

  // Share Button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
  },
  shareButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.primary.foreground,
  },

  // Steps Card
  stepsCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[4],
    gap: spacing[4],
  },
  stepItem: {
    flexDirection: 'row',
    gap: spacing[3],
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
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.primary.foreground,
  },
  stepContent: {
    flex: 1,
    gap: spacing[0.5],
  },
  stepTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  stepDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },

  // Stats Card
  statsCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[1],
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: colors.primary.DEFAULT,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderSolid,
  },
});
