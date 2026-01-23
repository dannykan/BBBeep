/**
 * Landing Screen
 * 首次開啟 App 的歡迎頁面
 * 設計對齊 Web 版本
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

export default function LandingScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            一句善意提醒{'\n'}讓路上少一點誤會
          </Text>
          <Text style={styles.heroSubtitle}>私密、不公開、不對罵</Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.featureCards}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.primary.DEFAULT}
              />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>
                不公開車牌、不公開任何個人資訊
              </Text>
              <Text style={styles.featureSubtitle}>完全保護隱私</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons
                name="shield-outline"
                size={20}
                color={colors.primary.DEFAULT}
              />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>不顯示對方身分</Text>
              <Text style={styles.featureSubtitle}>單向提醒，安全無壓力</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons
                name="wallet-outline"
                size={20}
                color={colors.primary.DEFAULT}
              />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>使用需點數</Text>
              <Text style={styles.featureSubtitle}>
                每天免費 2 點，用完隔天補滿
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-add-outline"
              size={18}
              color={colors.primary.foreground}
            />
            <Text style={styles.primaryButtonText}>立即註冊</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="log-in-outline"
              size={18}
              color={colors.foreground}
            />
            <Text style={styles.secondaryButtonText}>已有帳號？登入</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          這不是聊天平台，而是一次性的善意提醒服務
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginBottom: spacing[8],
  },
  heroTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.normal as any,
    color: colors.foreground,
    textAlign: 'center',
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.normal,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.muted.foreground,
    marginTop: spacing[3],
  },

  // Feature Cards
  featureCards: {
    gap: spacing[3],
    marginBottom: spacing[8],
  },
  featureCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  featureIconContainer: {
    marginTop: spacing[0.5],
  },
  featureTextContainer: {
    flex: 1,
    gap: spacing[0.5],
  },
  featureTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    fontWeight: typography.fontWeight.normal as any,
  },
  featureSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },

  // Action Buttons
  actionButtons: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  primaryButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: 48,
  },
  primaryButtonText: {
    color: colors.primary.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  secondaryButton: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.borderSolid,
    paddingVertical: spacing[3.5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: 48,
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },

  // Footer Note
  footerNote: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    textAlign: 'center',
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
});
