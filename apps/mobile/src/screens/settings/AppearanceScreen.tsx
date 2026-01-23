/**
 * Appearance Screen
 * 外觀模式設定頁面
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { typography, spacing, borderRadius } from '../../theme';

type ThemeOption = {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const themeOptions: ThemeOption[] = [
  {
    mode: 'light',
    label: '淺色模式',
    description: '始終使用淺色外觀',
    icon: 'sunny-outline',
  },
  {
    mode: 'dark',
    label: '深色模式',
    description: '始終使用深色外觀',
    icon: 'moon-outline',
  },
  {
    mode: 'system',
    label: '跟隨系統',
    description: '根據裝置設定自動切換',
    icon: 'phone-portrait-outline',
  },
];

export default function AppearanceScreen() {
  const navigation = useNavigation();
  const { themeMode, setThemeMode, colors } = useTheme();

  const handleSelectTheme = async (mode: ThemeMode) => {
    await setThemeMode(mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: colors.card.DEFAULT }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card.DEFAULT }}>
          <View style={[styles.header, { borderBottomColor: colors.borderSolid }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color={colors.muted.foreground} />
              <Text style={[styles.backText, { color: colors.muted.foreground }]}>返回</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>外觀模式</Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={[styles.optionsCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}>
          {themeOptions.map((option, index) => {
            const isSelected = themeMode === option.mode;
            const isLast = index === themeOptions.length - 1;

            return (
              <TouchableOpacity
                key={option.mode}
                style={[
                  styles.optionRow,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSolid },
                ]}
                onPress={() => handleSelectTheme(option.mode)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: colors.muted.DEFAULT }]}>
                  <Ionicons name={option.icon} size={20} color={colors.primary.DEFAULT} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.muted.foreground }]}>
                    {option.description}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary.DEFAULT} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info */}
        <Text style={[styles.infoText, { color: colors.muted.foreground }]}>
          選擇「跟隨系統」時，App 會根據您裝置的深色模式設定自動切換外觀。
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {},
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    padding: spacing[1],
  },
  backText: {
    fontSize: typography.fontSize.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerRight: {
    width: 80,
  },
  content: {
    padding: spacing[6],
  },
  optionsCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
    gap: spacing[0.5],
  },
  optionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing[4],
    lineHeight: typography.fontSize.sm * 1.5,
  },
});
