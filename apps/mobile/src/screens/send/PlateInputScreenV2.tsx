/**
 * Plate Input Screen V2
 * 合併車牌輸入 + 車型選擇（優化版）
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, CompactStepHeader } from './components';
import { normalizeLicensePlate, displayLicensePlate } from '@bbbeeep/shared';
import { formatPlateNumber } from '../../data/vehicleTemplates';
import { typography, spacing, borderRadius } from '../../theme';
import type { VehicleType } from '@bbbeeep/shared';

const RECENT_PLATES_KEY = 'bbbeeep_recent_plates';
const MAX_RECENT_PLATES = 5;

type Props = NativeStackScreenProps<SendStackParamList, 'PlateInput'>;

// 根據車牌格式自動判斷車型
function guessVehicleType(plate: string): VehicleType {
  const normalized = plate.replace(/[-\s]/g, '').toUpperCase();

  // 機車車牌格式：3字母3數字 或 3數字3字母
  if (/^[A-Z]{3}\d{3}$/.test(normalized) || /^\d{3}[A-Z]{3}$/.test(normalized)) {
    return 'scooter';
  }

  // 汽車車牌格式：3字母4數字、2字母4數字、4數字2字母
  return 'car';
}

export default function PlateInputScreenV2({ navigation }: Props) {
  const {
    vehicleType,
    plateInput,
    setVehicleType,
    setPlateInput,
    setTargetPlate,
  } = useSend();
  const { colors } = useTheme();

  const [recentPlates, setRecentPlates] = useState<{ plate: string; vehicleType: VehicleType }[]>([]);
  const [selectedType, setSelectedType] = useState<VehicleType>(vehicleType || 'car');

  // 載入最近發送的車牌
  useEffect(() => {
    loadRecentPlates();
  }, []);

  // 當車牌輸入改變時，自動判斷車型
  useEffect(() => {
    if (plateInput.length >= 6) {
      const guessed = guessVehicleType(plateInput);
      setSelectedType(guessed);
    }
  }, [plateInput]);

  const loadRecentPlates = async () => {
    try {
      const stored = await SecureStore.getItemAsync(RECENT_PLATES_KEY);
      if (stored) {
        setRecentPlates(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load recent plates:', err);
    }
  };

  const saveRecentPlate = async (plate: string, type: VehicleType) => {
    try {
      const newEntry = { plate, vehicleType: type };
      const updated = [
        newEntry,
        ...recentPlates.filter((p) => p.plate !== plate),
      ].slice(0, MAX_RECENT_PLATES);

      await SecureStore.setItemAsync(RECENT_PLATES_KEY, JSON.stringify(updated));
      setRecentPlates(updated);
    } catch (err) {
      console.error('Failed to save recent plate:', err);
    }
  };

  const handleSelectRecent = (plate: string, type: VehicleType) => {
    setPlateInput(plate);
    setSelectedType(type);
  };

  const handleSubmit = () => {
    const formatted = normalizeLicensePlate(plateInput);
    if (!formatted) {
      Alert.alert('錯誤', '請輸入正確的車牌格式');
      return;
    }

    setVehicleType(selectedType);
    setTargetPlate(formatted);
    saveRecentPlate(formatted, selectedType);
    navigation.navigate('Category');
  };

  const isValidPlate = plateInput.length >= 6;

  return (
    <SendLayout currentStep={1} totalSteps={4} showBackButton={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <CompactStepHeader
          title="輸入車牌號碼"
          subtitle="發送提醒給對方"
        />

        {/* 車牌輸入 */}
        <View style={styles.inputSection}>
          <TextInput
            style={[
              styles.plateInput,
              {
                backgroundColor: colors.card.DEFAULT,
                borderColor: isValidPlate ? colors.primary.DEFAULT : colors.borderSolid,
                color: colors.foreground,
              },
            ]}
            value={plateInput}
            onChangeText={(text) => setPlateInput(formatPlateNumber(text))}
            placeholder="ABC-1234"
            placeholderTextColor={colors.muted.foreground}
            autoCapitalize="characters"
            maxLength={10}
            autoFocus
          />
          <Text style={[styles.inputHint, { color: colors.muted.foreground }]}>
            僅用於投遞提醒，不會公開顯示
          </Text>
        </View>

        {/* 車輛類型選擇 */}
        <View style={styles.typeSection}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            車輛類型
          </Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor:
                    selectedType === 'car' ? colors.primary.DEFAULT : colors.card.DEFAULT,
                  borderColor:
                    selectedType === 'car' ? colors.primary.DEFAULT : colors.borderSolid,
                },
              ]}
              onPress={() => setSelectedType('car')}
              activeOpacity={0.7}
            >
              <FontAwesome6
                name="car"
                size={24}
                color={selectedType === 'car' ? colors.primary.foreground : colors.foreground}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  {
                    color: selectedType === 'car' ? colors.primary.foreground : colors.foreground,
                  },
                ]}
              >
                汽車
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor:
                    selectedType === 'scooter' ? colors.primary.DEFAULT : colors.card.DEFAULT,
                  borderColor:
                    selectedType === 'scooter' ? colors.primary.DEFAULT : colors.borderSolid,
                },
              ]}
              onPress={() => setSelectedType('scooter')}
              activeOpacity={0.7}
            >
              <FontAwesome6
                name="motorcycle"
                size={24}
                color={selectedType === 'scooter' ? colors.primary.foreground : colors.foreground}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  {
                    color: selectedType === 'scooter' ? colors.primary.foreground : colors.foreground,
                  },
                ]}
              >
                機車
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 最近發送 */}
        {recentPlates.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={[styles.sectionLabel, { color: colors.muted.foreground }]}>
              最近發送
            </Text>
            <View style={styles.recentList}>
              {recentPlates.map((item, index) => (
                <TouchableOpacity
                  key={`${item.plate}-${index}`}
                  style={[
                    styles.recentChip,
                    {
                      backgroundColor: colors.card.DEFAULT,
                      borderColor: colors.borderSolid,
                    },
                  ]}
                  onPress={() => handleSelectRecent(item.plate, item.vehicleType)}
                  activeOpacity={0.7}
                >
                  <FontAwesome6
                    name={item.vehicleType === 'car' ? 'car' : 'motorcycle'}
                    size={12}
                    color={colors.muted.foreground}
                  />
                  <Text style={[styles.recentChipText, { color: colors.foreground }]}>
                    {displayLicensePlate(item.plate)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 下一步按鈕 */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary.DEFAULT },
            !isValidPlate && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isValidPlate}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primary.foreground }]}>
            下一步
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.primary.foreground} />
        </TouchableOpacity>
      </ScrollView>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  inputSection: {
    marginBottom: spacing[6],
  },
  plateInput: {
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  typeSection: {
    marginBottom: spacing[6],
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    marginBottom: spacing[3],
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  typeButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  recentSection: {
    marginBottom: spacing[6],
  },
  recentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  recentChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    marginTop: spacing[4],
  },
  primaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
