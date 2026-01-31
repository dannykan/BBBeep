/**
 * Plate Input Screen V2
 * 合併車牌輸入 + 車型選擇（優化版）
 * 支援車牌收藏和最近發送功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, CompactStepHeader } from './components';
import {
  normalizeLicensePlate,
  displayLicensePlate,
  savedPlatesApi,
  SavedPlate,
  RecentSentPlate,
} from '@bbbeeep/shared';
import { formatPlateNumber } from '../../data/vehicleTemplates';
import { typography, spacing, borderRadius } from '../../theme';
import type { VehicleType } from '@bbbeeep/shared';
import { getErrorMessage } from '../../lib/error-utils';

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
  const { colors, isDark } = useTheme();

  const [savedPlates, setSavedPlates] = useState<SavedPlate[]>([]);
  const [recentPlates, setRecentPlates] = useState<RecentSentPlate[]>([]);
  const [selectedType, setSelectedType] = useState<VehicleType>(vehicleType || 'car');
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNickname, setSaveNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCurrentPlateSaved, setIsCurrentPlateSaved] = useState(false);

  // Load saved and recent plates
  const loadData = useCallback(async () => {
    setIsLoadingSaved(true);
    setIsLoadingRecent(true);
    try {
      const [saved, recent] = await Promise.all([
        savedPlatesApi.getAll(),
        savedPlatesApi.getRecentSent(5),
      ]);
      setSavedPlates(saved);
      setRecentPlates(recent);
    } catch (err) {
      console.error('Failed to load plates:', err);
    } finally {
      setIsLoadingSaved(false);
      setIsLoadingRecent(false);
    }
  }, []);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Check if current plate is saved
  useEffect(() => {
    if (plateInput.length >= 6) {
      const normalized = normalizeLicensePlate(plateInput);
      if (normalized) {
        const isSaved = savedPlates.some((p) => p.licensePlate === normalized);
        setIsCurrentPlateSaved(isSaved);
      }
    } else {
      setIsCurrentPlateSaved(false);
    }
  }, [plateInput, savedPlates]);

  // 當車牌輸入改變時，自動判斷車型
  useEffect(() => {
    if (plateInput.length >= 6) {
      const guessed = guessVehicleType(plateInput);
      setSelectedType(guessed);
    }
  }, [plateInput]);

  const handleSelectSaved = (plate: SavedPlate) => {
    setPlateInput(displayLicensePlate(plate.licensePlate));
    setSelectedType(plate.vehicleType as VehicleType);
  };

  const handleSelectRecent = (plate: RecentSentPlate) => {
    setPlateInput(displayLicensePlate(plate.licensePlate));
    setSelectedType(plate.vehicleType as VehicleType);
  };

  const handleSaveBookmark = async () => {
    const normalized = normalizeLicensePlate(plateInput);
    if (!normalized) {
      Alert.alert('錯誤', '請輸入正確的車牌格式');
      return;
    }
    if (!saveNickname.trim()) {
      Alert.alert('錯誤', '請輸入暱稱');
      return;
    }

    setIsSaving(true);
    try {
      const newPlate = await savedPlatesApi.create({
        licensePlate: normalized,
        nickname: saveNickname.trim(),
        vehicleType: selectedType,
      });
      setSavedPlates((prev) => [newPlate, ...prev]);
      setShowSaveModal(false);
      setSaveNickname('');
      setIsCurrentPlateSaved(true);
    } catch (error: any) {
      Alert.alert('錯誤', getErrorMessage(error, '收藏失敗'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    const formatted = normalizeLicensePlate(plateInput);
    if (!formatted) {
      Alert.alert('錯誤', '請輸入正確的車牌格式');
      return;
    }

    setVehicleType(selectedType);
    setTargetPlate(formatted);
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

        {/* 車牌輸入區域 */}
        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.plateInput,
                {
                  backgroundColor: colors.card.DEFAULT,
                  borderColor: isValidPlate ? colors.primary.DEFAULT : colors.border,
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
            {/* 收藏按鈕 */}
            {isValidPlate && (
              <TouchableOpacity
                style={[
                  styles.bookmarkButton,
                  {
                    backgroundColor: isCurrentPlateSaved
                      ? isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7'
                      : colors.card.DEFAULT,
                    borderColor: isCurrentPlateSaved
                      ? isDark ? '#FBBF24' : '#D97706'
                      : colors.border,
                  },
                ]}
                onPress={() => {
                  if (!isCurrentPlateSaved) {
                    setShowSaveModal(true);
                  }
                }}
                disabled={isCurrentPlateSaved}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isCurrentPlateSaved ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isCurrentPlateSaved ? (isDark ? '#FBBF24' : '#D97706') : colors.text.secondary}
                />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.inputHint, { color: colors.muted.foreground }]}>
            「-」可以不用輸入，僅用於投遞提醒
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
                    selectedType === 'car' ? colors.primary.DEFAULT : colors.border,
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
                    selectedType === 'scooter' ? colors.primary.DEFAULT : colors.border,
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

        {/* 收藏車牌 */}
        {savedPlates.length > 0 && (
          <View style={styles.savedSection}>
            <View style={styles.savedHeader}>
              <View style={styles.savedTitleRow}>
                <Ionicons name="bookmark" size={16} color={isDark ? '#FBBF24' : '#D97706'} />
                <Text style={[styles.sectionLabel, { color: colors.foreground, marginBottom: 0 }]}>
                  收藏車牌
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('SavedPlates')}
                activeOpacity={0.7}
              >
                <Text style={[styles.manageLink, { color: colors.primary.DEFAULT }]}>
                  管理
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.savedList}>
              {savedPlates.slice(0, 4).map((plate) => (
                <TouchableOpacity
                  key={plate.id}
                  style={[
                    styles.savedCard,
                    {
                      backgroundColor: colors.card.DEFAULT,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleSelectSaved(plate)}
                  activeOpacity={0.7}
                >
                  <FontAwesome6
                    name={plate.vehicleType === 'car' ? 'car' : 'motorcycle'}
                    size={14}
                    color={colors.primary.DEFAULT}
                  />
                  <View style={styles.savedCardText}>
                    <Text style={[styles.savedNickname, { color: colors.foreground }]} numberOfLines={1}>
                      {plate.nickname}
                    </Text>
                    <Text style={[styles.savedPlate, { color: colors.muted.foreground }]}>
                      {displayLicensePlate(plate.licensePlate)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 最近發送 */}
        {recentPlates.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Ionicons name="time-outline" size={16} color={colors.muted.foreground} />
              <Text style={[styles.sectionLabel, { color: colors.muted.foreground, marginBottom: 0 }]}>
                最近發送
              </Text>
            </View>
            <View style={styles.recentList}>
              {recentPlates.map((item, index) => (
                <TouchableOpacity
                  key={`${item.licensePlate}-${index}`}
                  style={[
                    styles.recentChip,
                    {
                      backgroundColor: colors.card.DEFAULT,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleSelectRecent(item)}
                  activeOpacity={0.7}
                >
                  <FontAwesome6
                    name={item.vehicleType === 'car' ? 'car' : 'motorcycle'}
                    size={12}
                    color={colors.muted.foreground}
                  />
                  <Text style={[styles.recentChipText, { color: colors.foreground }]}>
                    {displayLicensePlate(item.licensePlate)}
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

      {/* 收藏 Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card.DEFAULT }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>收藏車牌</Text>

            <View style={[styles.modalPlateDisplay, { backgroundColor: colors.muted.DEFAULT }]}>
              <FontAwesome6
                name={selectedType === 'car' ? 'car' : 'motorcycle'}
                size={16}
                color={colors.primary.DEFAULT}
              />
              <Text style={[styles.modalPlateText, { color: colors.text.primary }]}>
                {plateInput}
              </Text>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text.secondary }]}>暱稱</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              value={saveNickname}
              onChangeText={setSaveNickname}
              placeholder="例：老婆的車"
              placeholderTextColor={colors.muted.foreground}
              maxLength={20}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowSaveModal(false);
                  setSaveNickname('');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelButtonText, { color: colors.text.secondary }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  { backgroundColor: colors.primary.DEFAULT },
                  !saveNickname.trim() && styles.buttonDisabled,
                ]}
                onPress={handleSaveBookmark}
                disabled={isSaving || !saveNickname.trim()}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.primary.foreground} />
                ) : (
                  <Text style={[styles.modalConfirmButtonText, { color: colors.primary.foreground }]}>收藏</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  inputSection: {
    marginBottom: spacing[6],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  plateInput: {
    flex: 1,
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
  },
  bookmarkButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Saved plates section
  savedSection: {
    marginBottom: spacing[6],
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  savedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  manageLink: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  savedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minWidth: '48%',
  },
  savedCardText: {
    flex: 1,
  },
  savedNickname: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },
  savedPlate: {
    fontSize: typography.fontSize.xs,
    marginTop: 1,
  },
  // Recent plates section
  recentSection: {
    marginBottom: spacing[6],
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  modalContent: {
    borderRadius: 20,
    padding: spacing[6],
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  modalPlateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[4],
  },
  modalPlateText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing[2],
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 16,
    marginBottom: spacing[5],
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
