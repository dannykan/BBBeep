/**
 * Situation Screen
 * 選擇具體情況
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, StepHeader } from './components';
import { getSituationsByVehicleType, getMessageByVehicleType } from '../../data/vehicleTemplates';
import { typography, spacing, borderRadius } from '../../theme';

type Props = NativeStackScreenProps<SendStackParamList, 'Situation'>;

export default function SituationScreen({ navigation }: Props) {
  const {
    vehicleType,
    selectedCategory,
    setSelectedSituation,
    setGeneratedMessage,
  } = useSend();
  const { colors } = useTheme();

  const situations = vehicleType
    ? getSituationsByVehicleType(vehicleType, selectedCategory || '車況提醒')
    : [];

  const handleSelect = (situationId: string) => {
    if (!vehicleType) return;
    setSelectedSituation(situationId);

    // 其他讚美：直接進入輸入界面
    if (selectedCategory === '讚美感謝' && situationId === 'other-praise') {
      setGeneratedMessage('');
      navigation.navigate('Custom');
      return;
    }

    const message = getMessageByVehicleType(vehicleType, situationId);
    setGeneratedMessage(message);
    navigation.navigate('Review');
  };

  return (
    <SendLayout currentStep={4} totalSteps={5}>
      <StepHeader
        title="選擇具體情況"
        subtitle="選擇最符合的情況"
      />

      <View style={styles.situationList}>
        {situations.map((situation) => (
          <TouchableOpacity
            key={situation.id}
            style={[styles.situationItem, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}
            onPress={() => handleSelect(situation.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.situationLabel, { color: colors.foreground }]}>{situation.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.muted.foreground} />
          </TouchableOpacity>
        ))}
      </View>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  situationList: {
    gap: spacing[2],
  },
  situationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  situationLabel: {
    fontSize: typography.fontSize.base,
  },
});
