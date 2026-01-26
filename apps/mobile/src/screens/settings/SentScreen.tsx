/**
 * Sent Screen
 * 發送記錄頁面 - 對齊 Web 版本設計
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { messagesApi, displayLicensePlate } from '@bbbeeep/shared';
import type { SentMessage } from '@bbbeeep/shared';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useUnreadReply } from '../../context/UnreadReplyContext';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type SentScreenRouteParams = {
  Sent: {
    selectedMessageId?: string;
  };
};

export default function SentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SentScreenRouteParams, 'Sent'>>();
  const { colors, isDark } = useTheme();
  const { refreshUnreadReplyCount } = useUnreadReply();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [initialMessageHandled, setInitialMessageHandled] = useState(false);

  // 從導航參數中獲取要顯示的訊息 ID
  const selectedMessageId = route.params?.selectedMessageId;

  useEffect(() => {
    loadSentMessages();
  }, []);

  // 當從推播通知進入時，自動選擇對應的訊息
  useEffect(() => {
    if (selectedMessageId && sentMessages.length > 0 && !initialMessageHandled) {
      const message = sentMessages.find(m => m.id === selectedMessageId);
      if (message) {
        handleSelectMessage(selectedMessageId);
        setInitialMessageHandled(true);
      }
    }
  }, [selectedMessageId, sentMessages, initialMessageHandled]);

  // 選擇訊息時，如果有未讀回覆則標記為已讀
  const handleSelectMessage = useCallback(async (messageId: string) => {
    const message = sentMessages.find(m => m.id === messageId);
    if (message?.replyText && !message.replyReadAt) {
      try {
        await messagesApi.markReplyAsRead(messageId);
        // 更新本地狀態
        setSentMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, replyReadAt: new Date().toISOString() } : m
        ));
        // 刷新未讀回覆計數
        refreshUnreadReplyCount();
      } catch (error) {
        console.error('Failed to mark reply as read:', error);
      }
    }
    setSelectedMessage(messageId);
  }, [sentMessages, refreshUnreadReplyCount]);

  const loadSentMessages = async () => {
    try {
      const messages = await messagesApi.getSent();
      setSentMessages(messages);
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '載入發送記錄失敗');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSentMessages();
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
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
    } catch {
      return '未知時間';
    }
  };

  const formatOccurredTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const formatOccurredAt = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const getTagStyle = (type: string) => {
    switch (type) {
      case '車況提醒':
        return { backgroundColor: '#7A8FA820', color: '#7A8FA8' };
      case '行車安全提醒':
        return { backgroundColor: '#E6A23C20', color: '#E6A23C' };
      case '讚美感謝':
        return { backgroundColor: '#8FA6BF20', color: '#8FA6BF' };
      default:
        return { backgroundColor: colors.muted.DEFAULT, color: colors.muted.foreground };
    }
  };

  const getAccentColor = (type: string) => {
    switch (type) {
      case '車況提醒':
        return '#7A8FA8';
      case '行車安全提醒':
        return '#E6A23C';
      case '讚美感謝':
        return '#8FA6BF';
      default:
        return colors.borderSolid;
    }
  };

  const selectedMsg = sentMessages.find((m) => m.id === selectedMessage);

  const openLocationInMaps = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    const url = Platform.select({
      ios: `maps:0,0?q=${encodedLocation}`,
      android: `geo:0,0?q=${encodedLocation}`,
    }) || `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`);
      }
    });
  };

  // Detail view
  if (selectedMessage && selectedMsg) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedMessage(null)}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={colors.muted.foreground}
                />
                <Text style={styles.backText}>返回</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>發送詳情</Text>
              <View style={styles.headerSpacer} />
            </View>
          </SafeAreaView>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Type and status badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: getTagStyle(selectedMsg.type).backgroundColor }]}>
              <Text style={[styles.typeBadgeText, { color: getTagStyle(selectedMsg.type).color }]}>
                {selectedMsg.type}
              </Text>
            </View>
            <Text style={styles.timeText}>{formatTime(selectedMsg.createdAt)}</Text>
            <View style={[styles.readBadge, selectedMsg.read ? styles.readBadgeRead : styles.readBadgeUnread]}>
              <Text style={[styles.readBadgeText, selectedMsg.read ? styles.readBadgeTextRead : styles.readBadgeTextUnread]}>
                {selectedMsg.read ? '✓ 已讀' : '未讀'}
              </Text>
            </View>
          </View>

          {/* Message content */}
          <View style={styles.messageCard}>
            <Text style={styles.templateText}>{selectedMsg.template}</Text>

            {selectedMsg.customText && (
              <View style={styles.customTextBox}>
                <Text style={styles.customTextLabel}>補充說明</Text>
                <Text style={styles.customTextContent}>{selectedMsg.customText}</Text>
              </View>
            )}
          </View>

          {/* Meta info card - 時間地點資訊 */}
          <View style={styles.metaCard}>
            {selectedMsg.occurredAt && (
              <View style={styles.metaRow}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.muted.foreground} />
                <View style={styles.metaTextColumn}>
                  <Text style={styles.metaText}>約 {formatOccurredAt(selectedMsg.occurredAt)} 發生</Text>
                  <Text style={styles.metaTextHint}>您回報的大約時間</Text>
                </View>
              </View>
            )}
            {selectedMsg.location && (
              <TouchableOpacity
                style={styles.metaRow}
                onPress={() => openLocationInMaps(selectedMsg.location!)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color={colors.primary.DEFAULT} />
                <Text style={styles.metaTextLink}>於 {selectedMsg.location} 附近</Text>
                <Ionicons name="open-outline" size={14} color={colors.primary.DEFAULT} />
              </TouchableOpacity>
            )}
            <View style={styles.metaRow}>
              <Ionicons name="send-outline" size={16} color={colors.muted.foreground} />
              <Text style={styles.metaText}>提醒發送於 {formatTime(selectedMsg.createdAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="car-outline" size={16} color={colors.muted.foreground} />
              <Text style={styles.metaText}>
                發送給：{selectedMsg.receiver.licensePlate
                  ? displayLicensePlate(selectedMsg.receiver.licensePlate)
                  : '未知車牌'}
              </Text>
            </View>
          </View>

          {/* Reply section */}
          {selectedMsg.replyText ? (
            <View style={styles.replyCard}>
              <Text style={styles.replyLabel}>對方的回覆</Text>
              <Text style={styles.replyText}>{selectedMsg.replyText}</Text>
            </View>
          ) : (
            <View style={styles.noReplyCard}>
              <Text style={styles.noReplyText}>對方尚未回覆</Text>
            </View>
          )}

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedMessage(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>關閉</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // List view
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
                color={colors.muted.foreground}
              />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>發送記錄</Text>
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
          <View style={styles.emptyCard}>
            <ActivityIndicator color={colors.primary.DEFAULT} />
            <Text style={styles.emptyText}>載入中...</Text>
          </View>
        ) : sentMessages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>尚無發送記錄</Text>
            <Text style={styles.emptyText}>當您發送提醒時，會顯示在這裡</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Send')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>發送提醒</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.messageList}>
            {sentMessages.map((message) => {
              const hasUnreadReply = message.replyText && !message.replyReadAt;
              return (
              <TouchableOpacity
                key={message.id}
                style={[styles.messageItem, { borderLeftColor: getAccentColor(message.type) }]}
                onPress={() => handleSelectMessage(message.id)}
                activeOpacity={0.7}
              >
                <View style={styles.messageContent}>
                  {/* Badges row */}
                  <View style={styles.messageBadgesRow}>
                    <View style={[styles.typeBadge, { backgroundColor: getTagStyle(message.type).backgroundColor }]}>
                      <Text style={[styles.typeBadgeText, { color: getTagStyle(message.type).color }]}>
                        {message.type}
                      </Text>
                    </View>
                    {message.read && (
                      <Text style={styles.readStatusText}>已讀</Text>
                    )}
                    {message.replyText && (
                      <View style={[styles.repliedBadge, hasUnreadReply && styles.repliedBadgeUnread]}>
                        <Text style={[styles.repliedBadgeText, hasUnreadReply && styles.repliedBadgeTextUnread]}>
                          {hasUnreadReply ? '• 新回覆' : '已回覆'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.messageTime}>{formatTime(message.createdAt)}</Text>
                  </View>

                  {/* Template */}
                  <Text style={styles.messageTemplate} numberOfLines={1}>
                    {message.template}
                  </Text>

                  {/* Custom text */}
                  {message.customText && (
                    <Text style={styles.messageCustomText} numberOfLines={1}>
                      {message.customText}
                    </Text>
                  )}

                  {/* Receiver */}
                  <Text style={styles.messageReceiver}>
                    發送給：{message.receiver.licensePlate
                      ? displayLicensePlate(message.receiver.licensePlate)
                      : '未知車牌'}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.muted.foreground}
                />
              </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    backgroundColor: colors.card.DEFAULT,
  },
  headerSafeArea: {
    backgroundColor: colors.card.DEFAULT,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSolid,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[1],
  },
  backText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    marginLeft: spacing[1],
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal as any,
    color: colors.foreground,
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
    padding: spacing[6],
    gap: spacing[4],
  },

  // Empty state
  emptyCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[8],
    alignItems: 'center',
    gap: spacing[4],
  },
  emptyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    textAlign: 'center',
  },

  // Primary button
  primaryButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
  },
  primaryButtonText: {
    color: colors.primary.foreground,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },

  // Message list
  messageList: {
    gap: spacing[2],
  },
  messageItem: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderLeftWidth: 3,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1.5],
  },
  messageBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  typeBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
  readStatusText: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },
  repliedBadge: {
    backgroundColor: isDark ? 'rgba(74, 222, 128, 0.15)' : '#DCFCE7',
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  repliedBadgeUnread: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
  },
  repliedBadgeText: {
    fontSize: typography.fontSize.xs,
    color: isDark ? '#4ADE80' : '#16A34A',
  },
  repliedBadgeTextUnread: {
    color: isDark ? '#F87171' : '#DC2626',
    fontWeight: typography.fontWeight.medium as any,
  },
  messageTime: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    marginLeft: 'auto',
  },
  messageTemplate: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  messageCustomText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },
  messageReceiver: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },

  // Detail view
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },
  readBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  readBadgeRead: {
    backgroundColor: isDark ? 'rgba(74, 222, 128, 0.15)' : '#DCFCE7',
  },
  readBadgeUnread: {
    backgroundColor: colors.muted.DEFAULT,
  },
  readBadgeText: {
    fontSize: typography.fontSize.xs,
  },
  readBadgeTextRead: {
    color: isDark ? '#4ADE80' : '#16A34A',
  },
  readBadgeTextUnread: {
    color: colors.muted.foreground,
  },

  // Message card in detail
  messageCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    padding: spacing[4],
    gap: spacing[4],
  },
  templateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
    lineHeight: typography.fontSize.lg * typography.lineHeight.relaxed,
  },
  customTextBox: {
    backgroundColor: colors.primary.soft,
    borderWidth: 1,
    borderColor: `${colors.primary.DEFAULT}20`,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[1],
  },
  customTextLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },
  customTextContent: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },

  // Meta card - 時間地點資訊
  metaCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderSolid,
    gap: spacing[3],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  metaTextColumn: {
    flex: 1,
    gap: spacing[0.5],
  },
  metaText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },
  metaTextHint: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    opacity: 0.7,
  },
  metaTextLink: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.primary.DEFAULT,
  },

  // Reply section
  replyCard: {
    backgroundColor: isDark ? 'rgba(74, 222, 128, 0.15)' : '#DCFCE7',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(74, 222, 128, 0.3)' : '#BBF7D0',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  replyLabel: {
    fontSize: typography.fontSize.xs,
    color: isDark ? '#4ADE80' : '#16A34A',
  },
  replyText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  noReplyCard: {
    backgroundColor: `${colors.muted.DEFAULT}30`,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
  },
  noReplyText: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },

  // Close button
  closeButton: {
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },
  });
