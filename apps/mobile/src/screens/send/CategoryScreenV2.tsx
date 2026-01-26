/**
 * Category Screen V2
 * 選擇提醒類型（卡片式優化版）
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, CompactStepHeader } from './components';
import { displayLicensePlate } from '@bbbeeep/shared';
import { typography, spacing, borderRadius } from '../../theme';

type ReminderCategory = '車況提醒' | '行車安全' | '讚美感謝' | '其他情況';

type Props = NativeStackScreenProps<SendStackParamList, 'Category'>;

interface CategoryOption {
  id: ReminderCategory;
  title: string;
  description: string;
  icon: string;
  iconFamily: 'ionicons' | 'fontawesome';
  color: string;
}

export default function CategoryScreenV2({ navigation }: Props) {
  const {
    vehicleType,
    targetPlate,
    setSelectedCategory,
    setSelectedSituation,
    setGeneratedMessage,
    setCustomText,
    setAiSuggestion,
    setUseAiVersion,
    setUsedAi,
  } = useSend();
  const { colors } = useTheme();

  const categories: CategoryOption[] = [
    {
      id: '車況提醒',
      title: '車況提醒',
      description: '車燈、輪胎、車門、物品掉落等',
      icon: vehicleType === 'car' ? 'car' : 'motorcycle',
      iconFamily: 'fontawesome',
      color: colors.accent?.vehicle || colors.primary.DEFAULT,
    },
    {
      id: '行車安全',
      title: '行車安全',
      description: '危險駕駛、違規、需注意安全等',
      icon: 'warning-outline',
      iconFamily: 'ionicons',
      color: colors.accent?.safety || '#F59E0B',
    },
    {
      id: '讚美感謝',
      title: '讚美感謝',
      description: '禮讓、幫助、感謝對方等',
      icon: 'heart-outline',
      iconFamily: 'ionicons',
      color: colors.accent?.praise || '#EC4899',
    },
    {
      id: '其他情況',
      title: '其他情況',
      description: '上述以外的提醒',
      icon: 'chatbubble-outline',
      iconFamily: 'ionicons',
      color: colors.muted.foreground,
    },
  ];

  const handleSelect = (category: ReminderCategory) => {
    // Reset previous selections
    setSelectedCategory(category);
    setSelectedSituation('');
    setGeneratedMessage('');
    setCustomText('');
    setAiSuggestion('');
    setUseAiVersion(false);
    setUsedAi(false);

    // Navigate to MessageEdit screen
    navigation.navigate('MessageEdit' as any, { category });
  };

  return (
    <SendLayout currentStep={2} totalSteps={4}>
      {/* Compact header with plate info */}
      <View style={styles.headerRow}>
        <View style={[styles.plateHeader, { backgroundColor: colors.card.DEFAULT }]}>
          <FontAwesome6
            name={vehicleType === 'car' ? 'car' : 'motorcycle'}
            size={14}
            color={colors.primary.DEFAULT}
          />
          <Text style={[styles.plateText, { color: colors.foreground }]}>
            {displayLicensePlate(targetPlate)}
          </Text>
        </View>
      </View>

      <CompactStepHeader
        title="選擇類型"
        subtitle="你想提醒什麼？"
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.categoryList}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: colors.card.DEFAULT,
                  borderColor: colors.borderSolid,
                },
              ]}
              onPress={() => handleSelect(category.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${category.color}15` }]}>
                {category.iconFamily === 'ionicons' ? (
                  <Ionicons name={category.icon as any} size={28} color={category.color} />
                ) : (
                  <FontAwesome6 name={category.icon as any} size={24} color={category.color} />
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {category.title}
                </Text>
                <Text style={[styles.cardDescription, { color: colors.muted.foreground }]}>
                  {category.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted.foreground} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  plateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.lg,
  },
  plateText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },
  categoryList: {
    gap: spacing[3],
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing[4],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    marginBottom: spacing[1],
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
  },
});
