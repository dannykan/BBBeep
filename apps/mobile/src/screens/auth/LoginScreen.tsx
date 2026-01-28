/**
 * Login Screen
 * 登入頁面 - 社交登入（Apple Sign-In / LINE Login）+ 車牌登入
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
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, borderRadius } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { appleLogin, lineLogin, licensePlateLogin } = useAuth();
  const { colors, isDark } = useTheme();
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isLineLoading, setIsLineLoading] = useState(false);
  const [isPlateLoading, setIsPlateLoading] = useState(false);

  // 車牌登入狀態
  const [showPlateLogin, setShowPlateLogin] = useState(false);
  const [licensePlate, setLicensePlate] = useState('');
  const [password, setPassword] = useState('');

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

  const handlePlateLogin = async () => {
    if (!licensePlate.trim()) {
      Alert.alert('請輸入車牌號碼');
      return;
    }
    if (!password.trim()) {
      Alert.alert('請輸入密碼');
      return;
    }

    setIsPlateLoading(true);
    try {
      await licensePlateLogin(licensePlate.trim(), password);
    } catch (error: any) {
      Alert.alert('登入失敗', error.message || '車牌或密碼錯誤');
    } finally {
      setIsPlateLoading(false);
    }
  };

  const isLoading = isAppleLoading || isLineLoading || isPlateLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with safe area */}
      <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                if (showPlateLogin) {
                  setShowPlateLogin(false);
                } else {
                  navigation.goBack();
                }
              }}
              style={styles.backButton}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.text.secondary}
              />
              <Text style={[styles.backText, { color: colors.text.secondary }]}>返回</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>登入</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {showPlateLogin ? '車牌登入' : '註冊/登入'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted.foreground }]}>
                {showPlateLogin ? '輸入車牌號碼和密碼' : '選擇登入方式'}
              </Text>
            </View>

            {showPlateLogin ? (
              /* 車牌登入表單 */
              <View style={styles.loginButtons}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>車牌號碼</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      }
                    ]}
                    placeholder="例如：ABC-1234"
                    placeholderTextColor={colors.muted.foreground}
                    value={licensePlate}
                    onChangeText={setLicensePlate}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>密碼</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      }
                    ]}
                    placeholder="輸入密碼"
                    placeholderTextColor={colors.muted.foreground}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[styles.plateLoginButton, isLoading && styles.buttonDisabled]}
                  onPress={handlePlateLogin}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  {isPlateLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.plateLoginButtonText}>登入</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* 社交登入按鈕 */
              <View style={styles.loginButtons}>
                {/* Apple Sign-In (iOS only) */}
                {Platform.OS === 'ios' && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={isDark
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={borderRadius.lg}
                    style={styles.appleButton}
                    onPress={handleAppleLogin}
                  />
                )}

                {/* Divider */}
                {Platform.OS === 'ios' && (
                  <View style={styles.dividerContainer}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dividerText, { color: colors.muted.foreground }]}>或</Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
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

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.muted.foreground }]}>或</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                {/* 車牌登入按鈕 */}
                <TouchableOpacity
                  style={[styles.plateButton, { borderColor: colors.border }]}
                  onPress={() => setShowPlateLogin(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="car-outline" size={20} color={colors.foreground} style={{ marginRight: spacing[2] }} />
                  <Text style={[styles.plateButtonText, { color: colors.foreground }]}>使用車牌登入</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Terms */}
            <Text style={[styles.terms, { color: colors.muted.foreground }]}>
              繼續即表示您同意我們的服務條款和隱私權政策
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  headerContainer: {},
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
  },
  backText: {
    fontSize: 14,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    borderWidth: 1,
  },

  // Title Section
  titleSection: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold as any,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
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
  },
  dividerText: {
    paddingHorizontal: spacing[2],
    fontSize: typography.fontSize.xs,
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

  // 車牌登入按鈕
  plateButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderWidth: 1,
  },
  plateButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },

  // 車牌登入表單
  inputContainer: {
    marginBottom: spacing[2],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    marginBottom: spacing[2],
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    height: 48,
  },
  plateLoginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginTop: spacing[2],
  },
  plateLoginButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },

  // Terms
  terms: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
});
