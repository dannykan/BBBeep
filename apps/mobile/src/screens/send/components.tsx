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
import { useSend } from '../../context/SendContext';
import { VoiceMemoPlayer } from '../../components/VoiceMemoPlayer';
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
  showVoiceMemo?: boolean;
  onBack?: () => void;
}

export function SendLayout({
  children,
  currentStep,
  totalSteps,
  title,
  showBackButton = true,
  showProgress = true,
  showVoiceMemo = true,
  onBack,
}: SendLayoutProps) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { voiceMemo } = useSend();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Compact Header with Progress */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={styles.compactHeader}>
          {/* Back button */}
          <View style={styles.headerLeft}>
            {showBackButton ? (
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: colors.muted.DEFAULT }]}
                onPress={handleBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={colors.foreground}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.backButtonPlaceholder} />
            )}
          </View>

          {/* Center: Step Progress */}
          {showProgress && (
            <View style={styles.progressCenter}>
              {/* Step Numbers with connecting lines */}
              <View style={styles.stepsRow}>
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s, index) => {
                  const isLastStep = s === totalSteps;
                  const isCurrent = s === currentStep;
                  const isCompleted = s < currentStep;

                  return (
                    <React.Fragment key={s}>
                      {/* Connecting line (before step, except first) */}
                      {index > 0 && (
                        <View
                          style={[
                            styles.stepLine,
                            {
                              backgroundColor: s <= currentStep
                                ? colors.primary.DEFAULT
                                : colors.border,
                            },
                          ]}
                        />
                      )}
                      {/* Step circle or final pill */}
                      {isLastStep ? (
                        // Final step: pill shape with icon + text
                        <View
                          style={[
                            styles.finalStepPill,
                            {
                              backgroundColor: isCurrent
                                ? colors.primary.DEFAULT
                                : isCompleted
                                ? `${colors.primary.DEFAULT}30`
                                : colors.muted.DEFAULT,
                              borderColor: s <= currentStep
                                ? colors.primary.DEFAULT
                                : colors.border,
                            },
                          ]}
                        >
                          {isCompleted ? (
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color={colors.primary.DEFAULT}
                            />
                          ) : null}
                          <Text
                            style={[
                              styles.finalStepText,
                              {
                                color: isCurrent
                                  ? colors.primary.foreground
                                  : isCompleted
                                  ? colors.primary.DEFAULT
                                  : colors.muted.foreground,
                              },
                            ]}
                          >
                            最後確認
                          </Text>
                        </View>
                      ) : (
                        // Regular step: circle with number
                        <View
                          style={[
                            styles.stepCircle,
                            {
                              backgroundColor: isCurrent
                                ? colors.primary.DEFAULT
                                : isCompleted
                                ? `${colors.primary.DEFAULT}30`
                                : colors.muted.DEFAULT,
                              borderColor: s <= currentStep
                                ? colors.primary.DEFAULT
                                : colors.border,
                            },
                          ]}
                        >
                          {isCompleted ? (
                            <Ionicons name="checkmark" size={10} color={colors.primary.DEFAULT} />
                          ) : (
                            <Text
                              style={[
                                styles.stepNumber,
                                {
                                  color: isCurrent
                                    ? colors.primary.foreground
                                    : colors.muted.foreground,
                                },
                              ]}
                            >
                              {s}
                            </Text>
                          )}
                        </View>
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          )}

          {/* Right: Empty or placeholder for balance */}
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

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
          {/* Voice memo player at top when available */}
          {showVoiceMemo && voiceMemo && <VoiceMemoPlayer />}
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

/**
 * Compact Step Header - 更緊湊的標題，標題和副標題在同一行
 */
export function CompactStepHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.compactStepHeader}>
      <Text style={[styles.compactStepTitle, { color: colors.foreground }]}>{title}</Text>
      {subtitle && (
        <>
          <View style={[styles.titleDivider, { backgroundColor: colors.border }]} />
          <Text style={[styles.compactStepSubtitle, { color: colors.muted.foreground }]}>{subtitle}</Text>
        </>
      )}
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

  // Compact Header
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
  },
  headerLeft: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 36,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 32,
    height: 32,
  },

  // Progress Center - Step Indicators
  progressCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold as any,
  },
  stepLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  finalStepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
    paddingHorizontal: spacing[2.5],
    borderRadius: 11,
    borderWidth: 1.5,
    gap: spacing[1],
  },
  finalStepText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold as any,
    letterSpacing: -0.2,
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1],
    paddingBottom: spacing[6],
  },

  // Step Header (original)
  stepHeader: {
    marginBottom: spacing[4],
  },
  stepTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    marginBottom: spacing[1],
  },
  stepSubtitle: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },

  // Compact Step Header (inline)
  compactStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2.5],
    flexWrap: 'wrap',
  },
  compactStepTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  titleDivider: {
    width: 1,
    height: 14,
    marginHorizontal: spacing[2],
  },
  compactStepSubtitle: {
    fontSize: typography.fontSize.sm,
  },
});
