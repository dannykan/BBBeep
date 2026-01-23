/**
 * Landing Screen
 * 首次開啟 App 的歡迎頁面
 * 設計對齊 Web 版本 - UBeep 新設計
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useTheme } from '../../context/ThemeContext';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

// Import logo
const ubeepLogo = require('../../../assets/ubeep-logo.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

export default function LandingScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Image source={ubeepLogo} style={styles.logo} resizeMode="cover" />
          </View>

          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            一個更溫和的路上提醒選擇
          </Text>

          <Text style={[styles.heroSubtitle, { color: colors.muted.foreground }]}>
            私下提醒對方，不對罵、不公開，也不會變成衝突
          </Text>
        </View>

        {/* Trial Card - Highlighted */}
        <View style={[
          styles.trialCard,
          {
            backgroundColor: isDark ? 'rgba(74, 111, 165, 0.15)' : '#EAF0F8',
            borderColor: isDark ? 'rgba(74, 111, 165, 0.3)' : 'rgba(74, 111, 165, 0.2)',
          }
        ]}>
          <Text style={[styles.trialTitle, { color: isDark ? '#7AA3D4' : '#3C5E8C' }]}>
            立即體驗完整提醒流程
          </Text>
          <View style={styles.trialBadgeRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color={isDark ? '#7AA3D4' : '#3C5E8C'}
            />
            <Text style={[styles.trialBadgeText, { color: isDark ? '#7AA3D4' : '#3C5E8C' }]}>
              免費試用 7 天｜贈送 50 點提醒次數
            </Text>
          </View>
          <Text style={[styles.trialNote, { color: isDark ? '#5A8FD4' : '#4A6FA5' }]}>
            試用結束後，未使用點數不會保留
          </Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.featureCards}>
          <View style={[styles.featureCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.primary.DEFAULT}
              style={styles.featureIcon}
            />
            <Text style={[styles.featureText, { color: colors.foreground }]}>
              不公開車牌與任何個人資訊
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}>
            <Ionicons
              name="shield-outline"
              size={18}
              color={colors.primary.DEFAULT}
              style={styles.featureIcon}
            />
            <Text style={[styles.featureText, { color: colors.foreground }]}>
              只提醒、不對話，不會變成爭執
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}>
            <Ionicons
              name="phone-portrait-outline"
              size={18}
              color={colors.primary.DEFAULT}
              style={styles.featureIcon}
            />
            <Text style={[styles.featureText, { color: colors.foreground }]}>
              流程簡單，30 秒內就能送出
            </Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: isDark ? '#4A6FA5' : '#3C5E8C' }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>開始免費提醒</Text>
          </TouchableOpacity>

          <Text style={[styles.buttonHint, { color: colors.muted.foreground }]}>
            包含 7 天試用與 50 點提醒次數
          </Text>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="log-in-outline"
              size={18}
              color={colors.foreground}
            />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              已有帳號登入
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Notes */}
        <View style={styles.footerNotes}>
          <Text style={[styles.footerNote, { color: colors.muted.foreground }]}>
            駕駛、騎士、行人都能使用
          </Text>
          <Text style={[styles.footerNote, { color: colors.muted.foreground }]}>
            UBeep 是提醒工具，不是聊天平台，也不會變成對話
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing[6],
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing[4],
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.normal as any,
    textAlign: 'center',
    lineHeight: typography.fontSize.xl * typography.lineHeight.relaxed,
    marginBottom: spacing[2],
  },
  heroSubtitle: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
    paddingHorizontal: spacing[2],
  },

  // Trial Card
  trialCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[5],
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  trialTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    marginBottom: spacing[2.5],
  },
  trialBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  trialBadgeText: {
    fontSize: typography.fontSize.sm,
  },
  trialNote: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing[1],
  },

  // Feature Cards
  featureCards: {
    gap: spacing[2.5],
    marginBottom: spacing[6],
  },
  featureCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[3.5],
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: spacing[3],
  },
  featureText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },

  // Action Buttons
  actionButtons: {
    marginBottom: spacing[5],
  },
  primaryButton: {
    borderRadius: borderRadius.xl,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  buttonHint: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  secondaryButton: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },

  // Footer Notes
  footerNotes: {
    gap: spacing[2],
  },
  footerNote: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
});
