/**
 * Category Screen
 * 選擇提醒類型
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, StepHeader } from './components';
import { typography, spacing, borderRadius } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - spacing[6] * 2 - spacing[4]) / 2;

type ReminderCategory = '車況提醒' | '行車安全' | '讚美感謝' | '其他情況';

type Props = NativeStackScreenProps<SendStackParamList, 'Category'>;

export default function CategoryScreen({ navigation }: Props) {
  const {
    vehicleType,
    setSelectedCategory,
    setSelectedSituation,
    setGeneratedMessage,
    setCustomText,
    setAiSuggestion,
    setUseAiVersion,
    setUsedAi,
  } = useSend();
  const { colors } = useTheme();

  const handleSelect = (category: ReminderCategory) => {
    setSelectedCategory(category);
    setSelectedSituation('');
    setGeneratedMessage('');
    setCustomText('');
    setAiSuggestion('');
    setUseAiVersion(false);
    setUsedAi(false);

    if (category === '其他情況') {
      navigation.navigate('Custom');
    } else {
      navigation.navigate('Situation');
    }
  };

  return (
    <SendLayout currentStep={3} totalSteps={5}>
      <StepHeader
        title="選擇提醒類型"
        subtitle="選擇最符合的類型"
      />

      <View style={styles.categoryGrid}>
        <TouchableOpacity
          style={[styles.categoryCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}
          onPress={() => handleSelect('車況提醒')}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <FontAwesome6
                name={vehicleType === 'car' ? 'car' : 'motorcycle'}
                size={36}
                color={colors.accent.vehicle}
              />
            </View>
            <Text style={[styles.categoryCardText, { color: colors.foreground }]}>車況提醒</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.categoryCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}
          onPress={() => handleSelect('行車安全')}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning-outline" size={40} color={colors.accent.safety} />
            </View>
            <Text style={[styles.categoryCardText, { color: colors.foreground }]}>行車安全</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.categoryCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}
          onPress={() => handleSelect('讚美感謝')}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="thumbs-up-outline" size={40} color={colors.accent.praise} />
            </View>
            <Text style={[styles.categoryCardText, { color: colors.foreground }]}>讚美感謝</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.categoryCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}
          onPress={() => handleSelect('其他情況')}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="help-circle-outline" size={40} color={colors.muted.foreground} />
            </View>
            <Text style={[styles.categoryCardText, { color: colors.foreground }]}>其他情況</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  categoryCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    textAlign: 'center',
  },
});
