/**
 * Saved Plates Screen
 * 車牌收藏管理頁面
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { savedPlatesApi, SavedPlate, displayLicensePlate, normalizeLicensePlate } from '@bbbeeep/shared';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { formatPlateNumber } from '../../data/vehicleTemplates';
import { typography, spacing, borderRadius } from '../../theme';

type VehicleType = 'car' | 'scooter';

export default function SavedPlatesScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [savedPlates, setSavedPlates] = useState<SavedPlate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addPlate, setAddPlate] = useState('');
  const [addNickname, setAddNickname] = useState('');
  const [addVehicleType, setAddVehicleType] = useState<VehicleType>('car');
  const [isAdding, setIsAdding] = useState(false);

  // Edit Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlate, setEditingPlate] = useState<SavedPlate | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editVehicleType, setEditVehicleType] = useState<VehicleType>('car');
  const [isEditing, setIsEditing] = useState(false);

  const loadSavedPlates = useCallback(async () => {
    try {
      const plates = await savedPlatesApi.getAll();
      setSavedPlates(plates);
    } catch (error: any) {
      console.error('Failed to load saved plates:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSavedPlates();
  }, [loadSavedPlates]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadSavedPlates();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadSavedPlates]);

  const handleAdd = async () => {
    const normalized = normalizeLicensePlate(addPlate);
    if (!normalized) {
      Alert.alert('錯誤', '請輸入正確的車牌格式');
      return;
    }
    if (!addNickname.trim()) {
      Alert.alert('錯誤', '請輸入暱稱');
      return;
    }

    setIsAdding(true);
    try {
      const newPlate = await savedPlatesApi.create({
        licensePlate: normalized,
        nickname: addNickname.trim(),
        vehicleType: addVehicleType,
      });
      setSavedPlates((prev) => [newPlate, ...prev]);
      setShowAddModal(false);
      setAddPlate('');
      setAddNickname('');
      setAddVehicleType('car');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '新增收藏失敗');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEdit = (plate: SavedPlate) => {
    setEditingPlate(plate);
    setEditNickname(plate.nickname);
    setEditVehicleType(plate.vehicleType as VehicleType);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPlate) return;
    if (!editNickname.trim()) {
      Alert.alert('錯誤', '請輸入暱稱');
      return;
    }

    setIsEditing(true);
    try {
      const updated = await savedPlatesApi.update(editingPlate.id, {
        nickname: editNickname.trim(),
        vehicleType: editVehicleType,
      });
      setSavedPlates((prev) =>
        prev.map((p) => (p.id === editingPlate.id ? updated : p))
      );
      setShowEditModal(false);
      setEditingPlate(null);
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '更新失敗');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = (plate: SavedPlate) => {
    Alert.alert(
      '刪除收藏',
      `確定要刪除「${plate.nickname}」嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(plate.id);
            try {
              await savedPlatesApi.delete(plate.id);
              setSavedPlates((prev) => prev.filter((p) => p.id !== plate.id));
            } catch (error: any) {
              Alert.alert('錯誤', error.response?.data?.message || '刪除失敗');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderVehicleTypeSelector = (
    selected: VehicleType,
    onSelect: (type: VehicleType) => void
  ) => (
    <View style={styles.typeRow}>
      <TouchableOpacity
        style={[
          styles.typeButton,
          selected === 'car' && styles.typeButtonSelected,
        ]}
        onPress={() => onSelect('car')}
        activeOpacity={0.7}
      >
        <FontAwesome6
          name="car"
          size={18}
          color={selected === 'car' ? colors.primary.foreground : colors.foreground}
        />
        <Text
          style={[
            styles.typeButtonText,
            selected === 'car' && styles.typeButtonTextSelected,
          ]}
        >
          汽車
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.typeButton,
          selected === 'scooter' && styles.typeButtonSelected,
        ]}
        onPress={() => onSelect('scooter')}
        activeOpacity={0.7}
      >
        <FontAwesome6
          name="motorcycle"
          size={18}
          color={selected === 'scooter' ? colors.primary.foreground : colors.foreground}
        />
        <Text
          style={[
            styles.typeButtonText,
            selected === 'scooter' && styles.typeButtonTextSelected,
          ]}
        >
          機車
        </Text>
      </TouchableOpacity>
    </View>
  );

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
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.text.secondary}
              />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>車牌收藏</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={24} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>載入中...</Text>
          </View>
        ) : savedPlates.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="bookmark-outline" size={48} color={colors.text.secondary} />
            </View>
            <Text style={styles.emptyTitle}>沒有收藏的車牌</Text>
            <Text style={styles.emptyText}>
              收藏常用的車牌，方便快速發送提醒
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={colors.primary.foreground} />
              <Text style={styles.emptyAddButtonText}>新增收藏</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listCard}>
            {savedPlates.map((plate, index) => (
              <View
                key={plate.id}
                style={[
                  styles.plateItem,
                  index < savedPlates.length - 1 && styles.plateItemBorder,
                ]}
              >
                <View style={styles.plateInfo}>
                  <View style={styles.plateIcon}>
                    <FontAwesome6
                      name={plate.vehicleType === 'car' ? 'car' : 'motorcycle'}
                      size={18}
                      color={colors.primary.DEFAULT}
                    />
                  </View>
                  <View style={styles.plateDetails}>
                    <Text style={styles.plateNickname}>{plate.nickname}</Text>
                    <Text style={styles.plateLicense}>
                      {displayLicensePlate(plate.licensePlate)}
                    </Text>
                  </View>
                </View>
                <View style={styles.plateActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(plate)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={16} color={colors.text.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(plate)}
                    disabled={deletingId === plate.id}
                    activeOpacity={0.7}
                  >
                    {deletingId === plate.id ? (
                      <ActivityIndicator size="small" color={colors.destructive.DEFAULT} />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color={colors.destructive.DEFAULT} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.infoText}>
            收藏的車牌會在發送提醒時顯示，讓您快速選擇常用車牌。
          </Text>
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新增收藏車牌</Text>

            <Text style={styles.modalLabel}>車牌號碼</Text>
            <TextInput
              style={styles.modalInput}
              value={addPlate}
              onChangeText={(text) => setAddPlate(formatPlateNumber(text))}
              placeholder="ABC1234"
              placeholderTextColor={colors.muted.foreground}
              autoCapitalize="characters"
              maxLength={8}
            />
            <Text style={styles.plateHint}>「-」可以不用輸入</Text>

            <Text style={styles.modalLabel}>暱稱</Text>
            <TextInput
              style={styles.modalInput}
              value={addNickname}
              onChangeText={setAddNickname}
              placeholder="例：老婆的車"
              placeholderTextColor={colors.muted.foreground}
              maxLength={20}
            />

            <Text style={styles.modalLabel}>車輛類型</Text>
            {renderVehicleTypeSelector(addVehicleType, setAddVehicleType)}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setAddPlate('');
                  setAddNickname('');
                  setAddVehicleType('car');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  (!addPlate || !addNickname.trim()) && styles.modalButtonDisabled,
                ]}
                onPress={handleAdd}
                disabled={isAdding || !addPlate || !addNickname.trim()}
                activeOpacity={0.7}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color={colors.primary.foreground} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>新增</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>編輯收藏</Text>

            <Text style={styles.modalLabel}>車牌號碼</Text>
            <View style={styles.modalPlateDisplay}>
              <Text style={styles.modalPlateText}>
                {editingPlate ? displayLicensePlate(editingPlate.licensePlate) : ''}
              </Text>
            </View>

            <Text style={styles.modalLabel}>暱稱</Text>
            <TextInput
              style={styles.modalInput}
              value={editNickname}
              onChangeText={setEditNickname}
              placeholder="例：老婆的車"
              placeholderTextColor={colors.muted.foreground}
              maxLength={20}
            />

            <Text style={styles.modalLabel}>車輛類型</Text>
            {renderVehicleTypeSelector(editVehicleType, setEditVehicleType)}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingPlate(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  !editNickname.trim() && styles.modalButtonDisabled,
                ]}
                onPress={handleSaveEdit}
                disabled={isEditing || !editNickname.trim()}
                activeOpacity={0.7}
              >
                {isEditing ? (
                  <ActivityIndicator size="small" color={colors.primary.foreground} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>儲存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean = false) =>
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
      zIndex: 1,
    },
    backText: {
      fontSize: 14,
      color: colors.text.secondary,
      marginLeft: 4,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
    },
    addButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Scroll Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      gap: 16,
    },

    // Loading
    loadingContainer: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: colors.text.secondary,
    },

    // Empty State
    emptyCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      gap: 12,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.muted.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
    },
    emptyText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    emptyAddButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary.DEFAULT,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    emptyAddButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary.foreground,
    },

    // List Card
    listCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    plateItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    plateItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    plateInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    plateIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plateDetails: {
      flex: 1,
      gap: 2,
    },
    plateNickname: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    plateLicense: {
      fontSize: 13,
      color: colors.text.secondary,
      letterSpacing: 1,
    },
    plateActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.muted.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.destructive.light,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Info Card
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: 16,
      padding: 16,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: colors.text.secondary,
      lineHeight: 18,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 340,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: 20,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.secondary,
      marginBottom: 8,
    },
    plateHint: {
      fontSize: 12,
      color: colors.muted.foreground,
      marginTop: -4,
      marginBottom: 12,
    },
    modalInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.foreground,
      marginBottom: 16,
    },
    modalPlateDisplay: {
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
    },
    modalPlateText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      letterSpacing: 1,
    },
    typeRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    typeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    typeButtonSelected: {
      backgroundColor: colors.primary.DEFAULT,
      borderColor: colors.primary.DEFAULT,
    },
    typeButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    typeButtonTextSelected: {
      color: colors.primary.foreground,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    modalCancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    modalConfirmButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary.DEFAULT,
      alignItems: 'center',
    },
    modalConfirmButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary.foreground,
    },
    modalButtonDisabled: {
      opacity: 0.5,
    },
  });
