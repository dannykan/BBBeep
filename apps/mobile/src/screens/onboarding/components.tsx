/**
 * Onboarding Shared Components
 * 共用元件：Header, Progress, Card
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  showBackButton?: boolean;
}

export function OnboardingLayout({
  children,
  currentStep,
  totalSteps,
  showBackButton = true,
}: OnboardingLayoutProps) {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {showBackButton && navigation.canGoBack() ? (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={colors.text.secondary}
                  />
                  <Text style={[styles.backText, { color: colors.text.secondary }]}>返回</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              註冊流程 ({currentStep}/{totalSteps})
            </Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  { backgroundColor: colors.border },
                  s === currentStep && [styles.progressDotActive, { backgroundColor: colors.primary.DEFAULT }],
                  s < currentStep && { backgroundColor: `${colors.primary.DEFAULT}40` },
                ]}
              />
            ))}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function OnboardingCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export function StepHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepHeader}>
      {children}
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>{title}</Text>
      {subtitle && <Text style={[styles.stepSubtitle, { color: colors.muted.foreground }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
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
  headerLeft: {
    width: 80,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerRight: {
    width: 80,
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

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[6],
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  progressDotActive: {
    width: 32,
  },

  // Card
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    borderWidth: 1,
  },

  // Step Header
  stepHeader: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  stepTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium as any,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
});
