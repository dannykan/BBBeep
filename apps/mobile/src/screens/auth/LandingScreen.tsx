/**
 * Landing Screen
 * 首次開啟 App 的歡迎頁面
 * 對齊 Pencil 設計 - Warm Blue
 */

import React, { useMemo, useState, useEffect } from 'react';
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
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { appContentApi } from '@bbbeeep/shared';

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

export default function LandingScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // App content state with defaults
  const [tagline, setTagline] = useState('讓路上多一點善意 💙');
  const [subtext, setSubtext] = useState('透過車牌發送善意提醒\n讓每一位駕駛更安全');

  useEffect(() => {
    appContentApi.getContent()
      .then((content) => {
        if (content.landingTagline) setTagline(content.landingTagline);
        if (content.landingSubtext) setSubtext(content.landingSubtext);
      })
      .catch((error) => {
        console.log('Failed to load app content, using defaults:', error);
      });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo & Hero Section */}
        <View style={styles.heroSection}>
          {/* Logo */}
          <Image
            source={require('../../../assets/ubeep-logo.png')}
            style={styles.logo}
          />

          {/* Brand Name */}
          <Text style={styles.brandName}>UBeep</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>{tagline}</Text>

          {/* Subtext */}
          <Text style={styles.subtext}>{subtext}</Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.featureCards}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIconContainer, styles.featureIconBlue]}>
              <Ionicons name="chatbubble-outline" size={20} color="#3B82F6" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>善意提醒</Text>
              <Text style={styles.featureDescription}>透過車牌發送友善訊息</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIconContainer, styles.featureIconAmber]}>
              <Ionicons name="shield-outline" size={20} color="#D97706" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>安全匿名</Text>
              <Text style={styles.featureDescription}>保護您的隱私安全</Text>
            </View>
          </View>
        </View>

        {/* Trial Badge */}
        <View style={styles.trialBadge}>
          <Ionicons name="gift-outline" size={16} color="#D97706" />
          <Text style={styles.trialBadgeText}>新用戶 7 天試用期送 50 點！</Text>
        </View>
      </ScrollView>

      {/* Bottom CTA Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>立即開始</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.background : '#FFFFFF',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 40,
    },

    // Hero Section
    heroSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logo: {
      width: 80,
      height: 80,
      marginBottom: 16,
    },
    brandName: {
      fontSize: 40,
      fontWeight: '700',
      color: '#3B82F6',
      marginBottom: 16,
    },
    tagline: {
      fontSize: 20,
      fontWeight: '600',
      color: isDark ? colors.text.primary : '#1F2937',
      textAlign: 'center',
      marginBottom: 12,
    },
    subtext: {
      fontSize: 15,
      color: isDark ? colors.text.secondary : '#6B7280',
      textAlign: 'center',
      lineHeight: 24,
    },

    // Feature Cards
    featureCards: {
      gap: 12,
      marginBottom: 24,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: isDark ? colors.card.DEFAULT : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
      borderRadius: 16,
      padding: 16,
    },
    featureIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureIconBlue: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
    },
    featureIconAmber: {
      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
    },
    featureTextContainer: {
      flex: 1,
      gap: 2,
    },
    featureTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? colors.text.primary : '#1F2937',
    },
    featureDescription: {
      fontSize: 14,
      color: isDark ? colors.text.secondary : '#6B7280',
    },

    // Trial Badge
    trialBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignSelf: 'center',
    },
    trialBadgeText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#D97706',
    },

    // Bottom Section
    bottomSection: {
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 16,
      backgroundColor: isDark ? colors.background : '#FFFFFF',
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#3B82F6',
      borderRadius: 16,
      height: 56,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
