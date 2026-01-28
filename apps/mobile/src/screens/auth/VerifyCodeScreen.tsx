/**
 * Verify Code Screen
 * 驗證碼輸入頁面 - 對齊 Web 版本設計
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authApi, maskPhone } from '@bbbeeep/shared';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyCode'>;

export default function VerifyCodeScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const { login } = useAuth();
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('錯誤', '請輸入 6 位驗證碼');
      return;
    }

    setIsLoading(true);
    try {
      await login(phone, code);
      // 登入成功後會自動導向 Main 或 Onboarding
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '驗證失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authApi.verifyPhone(phone);
      Alert.alert('成功', '驗證碼已重新發送');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '重新發送失敗');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with safe area */}
      <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.text.secondary}
              />
              <Text style={[styles.backText, { color: colors.text.secondary }]}>返回</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>驗證</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary.bg }]}>
              <Ionicons name="mail-outline" size={32} color={colors.primary.DEFAULT} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>輸入驗證碼</Text>
            <Text style={[styles.subtitle, { color: colors.muted.foreground }]}>
              驗證碼已發送至 {maskPhone(phone)}
            </Text>
          </View>

          {/* Code Input */}
          <View style={styles.inputSection}>
            <TextInput
              ref={inputRef}
              style={[styles.codeInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              placeholder="000000"
              placeholderTextColor={colors.muted.foreground}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              autoFocus
              textAlign="center"
            />
            <Text style={[styles.inputHint, { color: colors.muted.foreground }]}>請輸入 6 位數驗證碼</Text>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              { backgroundColor: colors.primary.DEFAULT },
              (isLoading || code.length !== 6) && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={isLoading || code.length !== 6}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primary.foreground} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.primary.foreground} />
                <Text style={[styles.verifyButtonText, { color: colors.primary.foreground }]}>確認</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={isResending}
            activeOpacity={0.7}
          >
            {isResending ? (
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={16} color={colors.primary.DEFAULT} />
                <Text style={[styles.resendText, { color: colors.primary.DEFAULT }]}>重新發送驗證碼</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Ionicons name="information-circle-outline" size={16} color={colors.muted.foreground} />
          <Text style={[styles.helpText, { color: colors.muted.foreground }]}>
            如果沒有收到驗證碼，請檢查垃圾訊息或稍後再試
          </Text>
        </View>
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
  content: {
    flex: 1,
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
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold as any,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
  },

  // Input Section
  inputSection: {
    marginBottom: spacing[6],
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.medium as any,
    letterSpacing: 8,
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    marginTop: spacing[2],
  },

  // Verify Button
  verifyButton: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },

  // Resend
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[4],
    marginTop: spacing[2],
  },
  resendText: {
    fontSize: typography.fontSize.sm,
  },

  // Help Section
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  helpText: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    flex: 1,
  },
});
