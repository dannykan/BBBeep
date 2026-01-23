/**
 * Vehicle Type Screen
 * 選擇車種：汽車 / 機車
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, StepHeader } from './components';
import type { VehicleType } from '../../data/vehicleTemplates';
import { typography, spacing, borderRadius } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - spacing[6] * 2 - spacing[4]) / 2;

type Props = NativeStackScreenProps<SendStackParamList, 'VehicleType'>;

export default function VehicleTypeScreen({ navigation }: Props) {
  const { setVehicleType } = useSend();
  const { colors } = useTheme();

  const handleSelect = (type: VehicleType) => {
    setVehicleType(type);
    navigation.navigate('PlateInput');
  };

  return (
    <SendLayout currentStep={1} totalSteps={5} showBackButton={false}>
      <StepHeader
        title="對方是什麼車種？"
        subtitle="先選擇車種，提醒會更精準"
      />

      <View style={styles.vehicleGrid}>
        <TouchableOpacity
          style={[styles.vehicleCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}
          onPress={() => handleSelect('car')}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="car" size={56} color={colors.primary.DEFAULT} />
          <Text style={[styles.vehicleCardText, { color: colors.foreground }]}>汽車</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.vehicleCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}
          onPress={() => handleSelect('scooter')}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="motorcycle" size={56} color={colors.primary.DEFAULT} />
          <Text style={[styles.vehicleCardText, { color: colors.foreground }]}>機車</Text>
        </TouchableOpacity>
      </View>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  vehicleGrid: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  vehicleCard: {
    width: CARD_SIZE,
    aspectRatio: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  vehicleCardText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
});
