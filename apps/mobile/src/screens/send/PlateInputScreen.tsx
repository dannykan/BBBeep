/**
 * Plate Input Screen
 * 輸入車牌號碼
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, StepHeader } from './components';
import { normalizeLicensePlate } from '@bbbeeep/shared';
import {
  formatPlateNumber,
  getPlatePlaceholder,
  getVehicleTypeName,
} from '../../data/vehicleTemplates';
import { typography, spacing, borderRadius } from '../../theme';

type Props = NativeStackScreenProps<SendStackParamList, 'PlateInput'>;

export default function PlateInputScreen({ navigation }: Props) {
  const { vehicleType, plateInput, setPlateInput, setTargetPlate } = useSend();
  const { colors } = useTheme();

  const handleSubmit = () => {
    if (!vehicleType) return;
    const formatted = normalizeLicensePlate(plateInput);
    if (!formatted) {
      Alert.alert('錯誤', '請輸入正確的車牌格式');
      return;
    }
    setTargetPlate(formatted);
    navigation.navigate('Category');
  };

  return (
    <SendLayout currentStep={2} totalSteps={5}>
      <StepHeader
        title="請輸入對方的車牌號碼"
        subtitle="這樣才能把提醒送給對方"
      />

      {/* Vehicle type badge */}
      <View style={styles.vehicleBadge}>
        <FontAwesome6
          name={vehicleType === 'car' ? 'car' : 'motorcycle'}
          size={14}
          color={colors.primary.DEFAULT}
        />
        <Text style={[styles.vehicleBadgeText, { color: colors.primary.DEFAULT }]}>
          {getVehicleTypeName(vehicleType!)}
        </Text>
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>車牌號碼</Text>
        <TextInput
          style={[styles.plateInput, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border, color: colors.foreground }]}
          value={plateInput}
          onChangeText={(text) => setPlateInput(formatPlateNumber(text))}
          placeholder={getPlatePlaceholder(vehicleType!)}
          placeholderTextColor={colors.muted.foreground}
          autoCapitalize="characters"
          maxLength={10}
        />
        <Text style={[styles.inputHint, { color: colors.muted.foreground }]}>僅用於投遞提醒，不會公開顯示</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: colors.primary.DEFAULT },
          (!plateInput || plateInput.length < 4) && styles.buttonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!plateInput || plateInput.length < 4}
        activeOpacity={0.8}
      >
        <Text style={[styles.primaryButtonText, { color: colors.primary.foreground }]}>下一步</Text>
      </TouchableOpacity>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  vehicleBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  inputSection: {
    marginBottom: spacing[6],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    marginBottom: spacing[2],
  },
  plateInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
