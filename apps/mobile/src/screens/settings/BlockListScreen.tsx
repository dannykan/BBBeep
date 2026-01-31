/**
 * Block List Screen
 * 封鎖名單頁面
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usersApi, BlockedUser } from '@bbbeeep/shared';
import { getErrorMessage } from '../../lib/error-utils';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

export default function BlockListScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    try {
      const users = await usersApi.getBlockedList();
      setBlockedUsers(users);
    } catch (error: any) {
      console.error('Failed to load blocked users:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadBlockedUsers();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadBlockedUsers]);

  const handleUnblock = (item: BlockedUser) => {
    const displayName = item.blocked.nickname || '此用戶';

    Alert.alert(
      '解除封鎖',
      `確定要解除封鎖「${displayName}」嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '解除封鎖',
          onPress: async () => {
            setUnblockingId(item.id);
            try {
              await usersApi.unblockUser(item.blocked.id);
              setBlockedUsers((prev) => prev.filter((u) => u.id !== item.id));
              Alert.alert('成功', '已解除封鎖');
            } catch (error: any) {
              Alert.alert('錯誤', getErrorMessage(error, '解除封鎖失敗'));
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ]
    );
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
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.text.secondary}
              />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>封鎖名單</Text>
            <View style={styles.headerSpacer} />
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
        ) : blockedUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="ban-outline" size={48} color={colors.text.secondary} />
            </View>
            <Text style={styles.emptyTitle}>沒有封鎖的用戶</Text>
            <Text style={styles.emptyText}>
              當您封鎖其他用戶時，會顯示在這裡
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {blockedUsers.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.userItem,
                  index < blockedUsers.length - 1 && styles.userItemBorder,
                ]}
              >
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Ionicons name="person" size={20} color={colors.text.secondary} />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {item.blocked.nickname || '匿名用戶'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unblockButton}
                  onPress={() => handleUnblock(item)}
                  disabled={unblockingId === item.id}
                  activeOpacity={0.7}
                >
                  {unblockingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.destructive.DEFAULT} />
                  ) : (
                    <Text style={styles.unblockButtonText}>解除封鎖</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.infoText}>
            封鎖後，您將無法發送提醒給對方，也不會收到對方的提醒。
          </Text>
        </View>
      </ScrollView>
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
    headerSpacer: {
      width: 80,
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

    // List Card
    listCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    userItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    userAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.muted.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userDetails: {
      flex: 1,
      gap: 2,
    },
    userName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    unblockButton: {
      backgroundColor: colors.destructive.light,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      minWidth: 80,
      alignItems: 'center',
    },
    unblockButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.destructive.DEFAULT,
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
  });
