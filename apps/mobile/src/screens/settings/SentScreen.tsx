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
import { VoiceMessagePlayer } from '../../components/VoiceMessagePlayer';

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadSentMessages();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

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
        return isDark
          ? { backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }
          : { backgroundColor: '#EFF6FF', color: '#1D4ED8' };
      case '行車安全提醒':
        return isDark
          ? { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24' }
          : { backgroundColor: '#FEF3C7', color: '#D97706' };
      case '讚美感謝':
        return isDark
          ? { backgroundColor: 'rgba(236, 72, 153, 0.2)', color: '#F472B6' }
          : { backgroundColor: '#FCE7F3', color: '#DB2777' };
      default:
        return { backgroundColor: colors.muted.DEFAULT, color: colors.text.secondary };
    }
  };

  const getAccentColor = (type: string) => {
    switch (type) {
      case '車況提醒':
        return colors.primary.DEFAULT;
      case '行車安全提醒':
        return isDark ? '#FBBF24' : '#F59E0B';
      case '讚美感謝':
        return isDark ? '#F472B6' : '#EC4899';
      default:
        return colors.border;
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
                  color={colors.text.secondary}
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
            {/* Voice Message Player */}
            {selectedMsg.voiceUrl ? (
              <VoiceMessagePlayer
                voiceUrl={selectedMsg.voiceUrl}
                duration={selectedMsg.voiceDuration}
              />
            ) : (
              <>
                <Text style={styles.templateText}>{selectedMsg.template}</Text>

                {selectedMsg.customText && (
                  <View style={styles.customTextBox}>
                    <Text style={styles.customTextLabel}>補充說明</Text>
                    <Text style={styles.customTextContent}>{selectedMsg.customText}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Meta info card - 時間地點資訊 */}
          <View style={styles.metaCard}>
            {selectedMsg.occurredAt && (
              <View style={styles.metaRow}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.text.secondary} />
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
              <Ionicons name="send-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.metaText}>提醒發送於 {formatTime(selectedMsg.createdAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="car-outline" size={16} color={colors.text.secondary} />
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
                color={colors.text.secondary}
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

                  {/* Template or Voice indicator */}
                  {message.voiceUrl ? (
                    <View style={styles.voiceIndicator}>
                      <Ionicons name="mic" size={14} color={colors.primary.DEFAULT} />
                      <Text style={[styles.messageTemplate, { color: colors.primary.DEFAULT }]} numberOfLines={1}>
                        語音訊息
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.messageTemplate} numberOfLines={1}>
                        {message.template}
                      </Text>

                      {/* Custom text */}
                      {message.customText && (
                        <Text style={styles.messageCustomText} numberOfLines={1}>
                          {message.customText}
                        </Text>
                      )}
                    </>
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
                  color={colors.text.secondary}
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
      fontSize: 18,
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

    // Empty state
    emptyCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      gap: 16,
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

    // Primary button
    primaryButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },

    // Message list
    messageList: {
      gap: 12,
    },
    messageItem: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    messageContent: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    messageBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    typeBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    readStatusText: {
      fontSize: 11,
      color: colors.text.secondary,
    },
    repliedBadge: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    repliedBadgeUnread: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
    },
    repliedBadgeText: {
      fontSize: 11,
      fontWeight: '500',
      color: isDark ? '#4ADE80' : '#16A34A',
    },
    repliedBadgeTextUnread: {
      color: isDark ? '#F87171' : '#DC2626',
      fontWeight: '600',
    },
    messageTime: {
      fontSize: 11,
      color: colors.text.secondary,
      marginLeft: 'auto',
    },
    messageTemplate: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text.primary,
    },
    messageCustomText: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    messageReceiver: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    voiceIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },

    // Detail view
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    timeText: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    readBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    readBadgeRead: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
    },
    readBadgeUnread: {
      backgroundColor: colors.muted.DEFAULT,
    },
    readBadgeText: {
      fontSize: 12,
      fontWeight: '500',
    },
    readBadgeTextRead: {
      color: isDark ? '#4ADE80' : '#16A34A',
    },
    readBadgeTextUnread: {
      color: colors.text.secondary,
    },

    // Message card in detail
    messageCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      gap: 16,
    },
    templateText: {
      fontSize: 17,
      fontWeight: '500',
      color: colors.text.primary,
      lineHeight: 26,
    },
    customTextBox: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
      borderRadius: 12,
      padding: 16,
      gap: 6,
    },
    customTextLabel: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    customTextContent: {
      fontSize: 14,
      color: colors.text.primary,
      lineHeight: 22,
    },

    // Meta card - 時間地點資訊
    metaCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    metaTextColumn: {
      flex: 1,
      gap: 2,
    },
    metaText: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    metaTextHint: {
      fontSize: 11,
      color: colors.text.secondary,
      opacity: 0.7,
    },
    metaTextLink: {
      flex: 1,
      fontSize: 13,
      color: colors.primary.DEFAULT,
    },

    // Reply section
    replyCard: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : '#DCFCE7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#BBF7D0',
      borderRadius: 16,
      padding: 16,
      gap: 8,
    },
    replyLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#4ADE80' : '#16A34A',
    },
    replyText: {
      fontSize: 14,
      color: colors.text.primary,
      lineHeight: 22,
    },
    noReplyCard: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    noReplyText: {
      fontSize: 13,
      color: colors.text.secondary,
    },

    // Close button
    closeButton: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 14,
      color: colors.text.secondary,
    },
  });
