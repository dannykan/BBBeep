/**
 * Appearance Screen
 * 外觀模式設定頁面 - Warm Blue 設計
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeMode, ThemeColors } from '../../context/ThemeContext';

type ThemeOption = {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBgColor: string;
};

export default function AppearanceScreen() {
  const navigation = useNavigation();
  const { themeMode, setThemeMode, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const themeOptions: ThemeOption[] = [
    {
      mode: 'light',
      label: '淺色模式',
      icon: 'sunny',
      iconColor: '#F59E0B',
      iconBgColor: '#FEF3C7',
    },
    {
      mode: 'dark',
      label: '深色模式',
      icon: 'moon',
      iconColor: '#FFFFFF',
      iconBgColor: '#1E293B',
    },
    {
      mode: 'system',
      label: '跟隨系統',
      icon: 'phone-portrait',
      iconColor: colors.primary.DEFAULT,
      iconBgColor: '#DBEAFE',
    },
  ];

  const handleSelectTheme = async (mode: ThemeMode) => {
    await setThemeMode(mode);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>外觀設定</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {themeOptions.map((option) => {
          const isSelected = themeMode === option.mode;

          return (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected,
              ]}
              onPress={() => handleSelectTheme(option.mode)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.iconBgColor }]}>
                <Ionicons name={option.icon} size={22} color={option.iconColor} />
              </View>
              <Text style={styles.optionLabel}>{option.label}</Text>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.primary.DEFAULT}
                  style={styles.checkIcon}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    headerContainer: {
      backgroundColor: colors.background,
    },
    headerSafeArea: {
      backgroundColor: colors.background,
    },
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
      color: colors.text.secondary,
      marginLeft: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
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
    content: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 12,
    },

    // Option Card
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 64,
      paddingHorizontal: 16,
      gap: 12,
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionCardSelected: {
      borderColor: colors.primary.DEFAULT,
      borderWidth: 2,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.primary,
    },
    checkIcon: {
      marginLeft: 'auto',
    },
  });
