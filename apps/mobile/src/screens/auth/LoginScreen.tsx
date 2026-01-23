/**
 * Login Screen
 * 登入頁面 - 社交登入（Apple Sign-In / LINE Login）
 * 設計對齊 Web 版本
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { appleLogin, lineLogin } = useAuth();
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isLineLoading, setIsLineLoading] = useState(false);

  const handleAppleLogin = async () => {
    setIsAppleLoading(true);
    try {
      await appleLogin();
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('登入失敗', error.message || 'Apple 登入失敗，請稍後再試');
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleLineLogin = async () => {
    setIsLineLoading(true);
    try {
      await lineLogin();
    } catch (error: any) {
      Alert.alert('登入失敗', error.message || 'LINE 登入失敗，請稍後再試');
    } finally {
      setIsLineLoading(false);
    }
  };

  const isLoading = isAppleLoading || isLineLoading;

  return (
    <View style={styles.container}>
      {/* Header with safe area */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.muted.foreground}
              />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>登入</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card */}
        <View style={styles.card}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>註冊/登入</Text>
            <Text style={styles.subtitle}>選擇登入方式</Text>
          </View>

          {/* Login Buttons */}
          <View style={styles.loginButtons}>
            {/* Apple Sign-In (iOS only) */}
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={borderRadius.lg}
                style={styles.appleButton}
                onPress={handleAppleLogin}
              />
            )}

            {/* Divider (only show if both options are available) */}
            {Platform.OS === 'ios' && (
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>或</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            {/* LINE Login */}
            <TouchableOpacity
              style={[styles.lineButton, isLoading && styles.buttonDisabled]}
              onPress={handleLineLogin}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLineLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View style={styles.lineIconContainer}>
                    <Text style={styles.lineIcon}>LINE</Text>
                  </View>
                  <Text style={styles.lineButtonText}>使用 LINE 繼續</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            繼續即表示您同意我們的服務條款和隱私權政策
          </Text>
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

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[6],
  },

  // Card
  card: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },

  // Title Section
  titleSection: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.foreground,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },

  // Login Buttons
  loginButtons: {
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  appleButton: {
    height: 44,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[2],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSolid,
  },
  dividerText: {
    paddingHorizontal: spacing[2],
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    textTransform: 'uppercase',
  },

  // LINE Button
  lineButton: {
    backgroundColor: '#00B900',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  lineIconContainer: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    marginRight: spacing[2],
  },
  lineIcon: {
    color: '#00B900',
    fontWeight: 'bold',
    fontSize: typography.fontSize.xs,
  },
  lineButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },

  // Terms
  terms: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
});
