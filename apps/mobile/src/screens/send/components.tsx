/**
 * Send Shared Components
 * 共用元件：Layout, Header, Progress
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

interface SendLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  title?: string;
  showBackButton?: boolean;
  showProgress?: boolean;
  onBack?: () => void;
}

export function SendLayout({
  children,
  currentStep,
  totalSteps,
  title,
  showBackButton = true,
  showProgress = true,
  onBack,
}: SendLayoutProps) {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: colors.card.DEFAULT }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card.DEFAULT }}>
          <View style={[styles.header, { borderBottomColor: colors.borderSolid }]}>
            <View style={styles.headerLeft}>
              {showBackButton ? (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={colors.muted.foreground}
                  />
                  <Text style={[styles.backText, { color: colors.muted.foreground }]}>返回</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {title || `發送提醒 (${currentStep}/${totalSteps})`}
            </Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
      </View>

      {/* Progress indicator */}
      {showProgress && (
        <View style={[styles.progressContainer, { backgroundColor: colors.background }]}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                { backgroundColor: colors.borderSolid },
                s === currentStep && [styles.progressDotActive, { backgroundColor: colors.primary.DEFAULT }],
                s < currentStep && { backgroundColor: `${colors.primary.DEFAULT}40` },
              ]}
            />
          ))}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function StepHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepHeader}>
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
    borderBottomWidth: 1,
    paddingHorizontal: spacing[6],
    height: 52,
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
    paddingVertical: spacing[2],
    paddingRight: spacing[4],
  },
  backText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing[1],
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal as any,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  progressDotActive: {
    width: 32,
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[6],
  },

  // Step Header
  stepHeader: {
    marginBottom: spacing[6],
  },
  stepTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold as any,
    marginBottom: spacing[2],
  },
  stepSubtitle: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
});
