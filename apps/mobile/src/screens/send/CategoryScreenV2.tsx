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
  iconColor: string;
  iconBgColor: string;
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
      description: '輪胎、車燈、車門等',
      icon: 'alert-circle-outline',
      iconFamily: 'ionicons',
      iconColor: '#F59E0B',
      iconBgColor: '#FEF3C7',
    },
    {
      id: '行車安全',
      title: '行車安全',
      description: '危險駕駛、違規提醒',
      icon: 'shield-checkmark-outline',
      iconFamily: 'ionicons',
      iconColor: colors.primary.DEFAULT,
      iconBgColor: '#DBEAFE',
    },
    {
      id: '讚美感謝',
      title: '讚美感謝',
      description: '禮讓、好行為等',
      icon: 'heart',
      iconFamily: 'ionicons',
      iconColor: '#22C55E',
      iconBgColor: '#DCFCE7',
    },
    {
      id: '其他情況',
      title: '其他',
      description: '一般善意提醒',
      icon: 'chatbubble-outline',
      iconFamily: 'ionicons',
      iconColor: '#A855F7',
      iconBgColor: '#F3E8FF',
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
        <View style={styles.categoryGrid}>
          {/* Row 1 */}
          <View style={styles.categoryRow}>
            {categories.slice(0, 2).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: colors.card.DEFAULT,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleSelect(category.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: category.iconBgColor }]}>
                  <Ionicons name={category.icon as any} size={28} color={category.iconColor} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                  {category.title}
                </Text>
                <Text style={[styles.cardDescription, { color: colors.text.secondary }]}>
                  {category.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Row 2 */}
          <View style={styles.categoryRow}>
            {categories.slice(2, 4).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: colors.card.DEFAULT,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleSelect(category.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: category.iconBgColor }]}>
                  <Ionicons name={category.icon as any} size={28} color={category.iconColor} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                  {category.title}
                </Text>
                <Text style={[styles.cardDescription, { color: colors.text.secondary }]}>
                  {category.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    gap: 8,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
  },
  plateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryGrid: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
