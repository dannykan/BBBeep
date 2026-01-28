/**
 * Inbox List Screen
 * 提醒訊息列表頁面
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { messagesApi } from '@bbbeeep/shared';
import type { Message } from '@bbbeeep/shared';
import { useUnread } from '../../context/UnreadContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import type { InboxStackParamList } from '../../navigation/types';

type InboxListNavigationProp = NativeStackNavigationProp<InboxStackParamList, 'InboxScreen'>;

// 可愛動物頭像列表（使用 emoji）
const ANIMAL_AVATARS = [
  { emoji: '🐰', bg: '#FEE2E2' }, // 兔子 - 粉紅
  { emoji: '🐻', bg: '#FEF3C7' }, // 熊 - 黃
  { emoji: '🐱', bg: '#DBEAFE' }, // 貓 - 藍
  { emoji: '🐶', bg: '#D1FAE5' }, // 狗 - 綠
  { emoji: '🦊', bg: '#FFEDD5' }, // 狐狸 - 橘
  { emoji: '🐼', bg: '#E5E7EB' }, // 熊貓 - 灰
  { emoji: '🐨', bg: '#E0E7FF' }, // 無尾熊 - 紫藍
  { emoji: '🦁', bg: '#FEF9C3' }, // 獅子 - 淺黃
  { emoji: '🐯', bg: '#FFEDD5' }, // 老虎 - 橘
  { emoji: '🐸', bg: '#D1FAE5' }, // 青蛙 - 綠
  { emoji: '🐧', bg: '#DBEAFE' }, // 企鵝 - 藍
  { emoji: '🐮', bg: '#FEE2E2' }, // 牛 - 粉
];

// 隨機取得動物頭像
const getRandomAvatar = () => {
  return ANIMAL_AVATARS[Math.floor(Math.random() * ANIMAL_AVATARS.length)];
};

export default function InboxListScreen() {
  const navigation = useNavigation<InboxListNavigationProp>();
  const { refreshUnreadCount } = useUnread();
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // 為每則訊息隨機生成頭像（在訊息列表變化時重新生成）
  const messageAvatars = useMemo(() => {
    const avatarMap: Record<string, typeof ANIMAL_AVATARS[0]> = {};
    messages.forEach((msg) => {
      avatarMap[msg.id] = getRandomAvatar();
    });
    return avatarMap;
  }, [messages]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const data = await messagesApi.getAll();
      setMessages(data);
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '載入失敗');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Refresh messages when returning from detail screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMessages();
      refreshUnreadCount();
    });
    return unsubscribe;
  }, [navigation, loadMessages, refreshUnreadCount]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadMessages();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMessages]);

  const handleMessageClick = (message: Message) => {
    navigation.navigate('MessageDetail', { messageId: message.id });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

  const getTagColor = (type: string) => {
    switch (type) {
      case '車況提醒':
        return isDark
          ? { bg: 'rgba(74, 111, 165, 0.2)', text: '#7AA8E8' }
          : { bg: '#EFF6FF', text: '#1D4ED8' };
      case '行車安全提醒':
        return isDark
          ? { bg: 'rgba(245, 158, 11, 0.2)', text: '#F0B454' }
          : { bg: '#FEF3C7', text: '#D97706' };
      case '讚美感謝':
        return isDark
          ? { bg: 'rgba(236, 72, 153, 0.2)', text: '#F472B6' }
          : { bg: '#FCE7F3', text: '#DB2777' };
      default:
        return isDark
          ? { bg: colors.muted.DEFAULT, text: colors.muted.foreground }
          : { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getAccentColor = (type: string) => {
    switch (type) {
      case '車況提醒':
        return colors.primary.DEFAULT;
      case '行車安全提醒':
        return isDark ? '#F0B454' : '#F59E0B';
      case '讚美感謝':
        return isDark ? '#F472B6' : '#EC4899';
      default:
        return colors.primary.DEFAULT;
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  const renderItem = ({ item }: { item: Message }) => {
    const tagColors = getTagColor(item.type);
    const senderName = item.sender?.nickname || '匿名用戶';
    const isVoice = !!item.voiceUrl;
    const avatar = messageAvatars[item.id] || getRandomAvatar();

    return (
      <TouchableOpacity
        style={[styles.messageCard, !item.read && styles.messageCardUnread]}
        onPress={() => handleMessageClick(item)}
        activeOpacity={0.7}
      >
        {/* 動物頭像 */}
        <View style={[styles.avatarContainer, { backgroundColor: avatar.bg }]}>
          <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
        </View>

        {/* 內容區域 */}
        <View style={styles.messageCardContent}>
          {/* 上排：暱稱 */}
          <Text style={styles.senderName} numberOfLines={1}>
            {senderName}
          </Text>

          {/* 下排：類型標籤 + 訊息提示 */}
          <View style={styles.messagePreview}>
            <View style={[styles.typeBadgeSmall, { backgroundColor: tagColors.bg }]}>
              {isVoice && (
                <Ionicons name="mic" size={10} color={tagColors.text} style={{ marginRight: 3 }} />
              )}
              <Text style={[styles.typeBadgeSmallText, { color: tagColors.text }]}>
                {item.type}
              </Text>
            </View>
            <Text style={styles.messageHint}>
              {isVoice ? '語音訊息' : '訊息'}
            </Text>
          </View>
        </View>

        {/* 右側：未讀點 + 時間 + 箭頭 */}
        <View style={styles.rightSection}>
          {!item.read && <View style={styles.unreadDot} />}
          <Text style={styles.messageTime}>{formatDate(item.createdAt)}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="mail-open-outline" size={48} color={colors.text.secondary} />
      </View>
      <Text style={styles.emptyTitle}>尚無訊息</Text>
      <Text style={styles.emptySubtext}>當您收到提醒時，會顯示在這裡</Text>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>提醒訊息</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              <Ionicons name="refresh-outline" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {isLoading ? (
        renderLoading()
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.DEFAULT}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
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
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
    },
    badge: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    refreshButton: {
      padding: 8,
      borderRadius: 12,
    },

    // List
    listContent: {
      padding: 24,
      gap: 12,
    },
    emptyList: {
      flex: 1,
    },

    // Message Card
    messageCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    messageCardUnread: {
      backgroundColor: isDark ? 'rgba(249, 115, 22, 0.08)' : 'rgba(249, 115, 22, 0.05)',
      borderColor: isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)',
    },
    avatarContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmoji: {
      fontSize: 20,
    },
    messageCardContent: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    senderName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#F97316', // 橘色
    },
    messageTime: {
      fontSize: 11,
      color: colors.text.secondary,
    },
    messagePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    typeBadgeSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    typeBadgeSmallText: {
      fontSize: 11,
      fontWeight: '600',
    },
    messageHint: {
      fontSize: 13,
      color: colors.text.secondary,
    },

    // Empty State
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.muted.DEFAULT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
