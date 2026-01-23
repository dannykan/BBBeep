/**
 * Message Detail Screen
 * 訊息詳情頁面 - 支援原生滑動返回手勢
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { messagesApi, usersApi, aiApi, getTotalPoints } from '@bbbeeep/shared';
import type { Message, AiLimitResponse } from '@bbbeeep/shared';
import { useAuth } from '../../context/AuthContext';
import { useUnread } from '../../context/UnreadContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import type { InboxStackParamList } from '../../navigation/types';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type MessageDetailRouteProp = RouteProp<InboxStackParamList, 'MessageDetail'>;
type MessageDetailNavigationProp = NativeStackNavigationProp<InboxStackParamList, 'MessageDetail'>;

export default function MessageDetailScreen() {
  const navigation = useNavigation<MessageDetailNavigationProp>();
  const route = useRoute<MessageDetailRouteProp>();
  const { messageId } = route.params;
  const { user, refreshUser } = useAuth();
  const { refreshUnreadCount } = useUnread();
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reply states
  const [showCustomReply, setShowCustomReply] = useState(false);
  const [customReplyText, setCustomReplyText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [aiLimit, setAiLimit] = useState<AiLimitResponse>({ canUse: true, remaining: 5 });

  // Block/Report states
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const loadMessage = useCallback(async () => {
    try {
      const messages = await messagesApi.getAll();
      const foundMessage = messages.find((m) => m.id === messageId);
      if (foundMessage) {
        setMessage(foundMessage);
        // Mark as read
        if (!foundMessage.read) {
          await messagesApi.markAsRead(foundMessage.id);
          refreshUnreadCount();
        }
      } else {
        Alert.alert('錯誤', '找不到此訊息');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '載入失敗');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [messageId, navigation, refreshUnreadCount]);

  const loadAiLimit = useCallback(async () => {
    try {
      const limit = await aiApi.checkLimit();
      setAiLimit(limit);
    } catch (error) {
      console.error('Failed to load AI limit:', error);
    }
  }, []);

  useEffect(() => {
    loadMessage();
    loadAiLimit();
  }, [loadMessage, loadAiLimit]);

  const resetCustomReply = () => {
    setShowCustomReply(false);
    setCustomReplyText('');
    setAiSuggestion(null);
  };

  const getQuickReplyText = () => {
    return message?.type === '讚美感謝' ? '收到，謝謝！' : '收到，感謝提醒！';
  };

  const handleQuickReply = async () => {
    if (!message) return;

    const replyText = getQuickReplyText();
    setIsReplying(true);
    try {
      await messagesApi.reply(message.id, replyText, {
        isQuickReply: true,
      });

      setMessage({ ...message, replyText });
      Alert.alert('成功', '回覆已送出');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '回覆失敗');
    } finally {
      setIsReplying(false);
    }
  };

  const handleGetAiSuggestion = async () => {
    if (customReplyText.trim().length < 5) return;

    setIsLoadingAi(true);
    try {
      const result = await aiApi.rewrite(customReplyText, undefined, '回覆');
      setAiSuggestion(result.rewritten);
      const limitResult = await aiApi.checkLimit();
      setAiLimit(limitResult);
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || 'AI 改寫失敗');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleCustomReply = async (useAi: boolean) => {
    if (!message) return;

    const replyText = useAi && aiSuggestion ? aiSuggestion : customReplyText;
    const requiredPoints = useAi ? 2 : 4;

    if (getTotalPoints(user) < requiredPoints) {
      Alert.alert('點數不足', `需要 ${requiredPoints} 點才能送出回覆`);
      return;
    }

    setIsReplying(true);
    try {
      await messagesApi.reply(message.id, replyText, {
        useAiRewrite: useAi,
      });

      setMessage({ ...message, replyText });
      await refreshUser();
      resetCustomReply();
      Alert.alert('成功', '回覆已送出');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '回覆失敗');
    } finally {
      setIsReplying(false);
    }
  };

  const handleBlockSender = async () => {
    if (!message?.sender?.id) {
      Alert.alert('錯誤', '無法封鎖此用戶');
      return;
    }

    try {
      await usersApi.blockUser(message.sender.id);
      setShowBlockModal(false);
      Alert.alert('成功', '已封鎖該用戶', [
        { text: '確定', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '封鎖失敗');
    }
  };

  const handleReportMessage = async () => {
    if (!message) return;

    setIsReporting(true);
    try {
      await messagesApi.report(message.id, reportReason || undefined);
      setShowReportModal(false);
      setReportReason('');
      Alert.alert('成功', '檢舉已提交，我們會儘快處理');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '檢舉失敗');
    } finally {
      setIsReporting(false);
    }
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

  const formatOccurredAt = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
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

  const canAfford = (points: number) => getTotalPoints(user) >= points;

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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={20} color={colors.muted.foreground} />
                <Text style={styles.backText}>返回</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitleCenter}>訊息詳情</Text>
              <View style={styles.headerRight} />
            </View>
          </SafeAreaView>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </View>
    );
  }

  if (!message) {
    return null;
  }

  const tagColors = getTagColor(message.type);
  const accentColor = getAccentColor(message.type);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={colors.muted.foreground} />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitleCenter}>訊息詳情</Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.detailContent}
          contentContainerStyle={styles.detailContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Type Badge */}
          <View style={styles.detailHeader}>
            <View style={[styles.typeBadge, { backgroundColor: tagColors.bg }]}>
              <Text style={[styles.typeBadgeText, { color: tagColors.text }]}>
                {message.type}
              </Text>
            </View>
            <Text style={styles.detailTime}>{formatDate(message.createdAt)}</Text>
          </View>

          {/* Main Content */}
          <View style={[styles.detailCard, { borderLeftColor: accentColor }]}>
            <Text style={styles.templateText}>{message.template}</Text>

            {message.customText && (
              <View style={styles.customTextSection}>
                <Text style={styles.sectionLabel}>補充說明</Text>
                <Text style={styles.customTextValue}>{message.customText}</Text>
              </View>
            )}
          </View>

          {/* Meta Info */}
          <View style={styles.metaCard}>
            {message.occurredAt && (
              <View style={styles.metaRow}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.muted.foreground} />
                <View style={styles.metaTextColumn}>
                  <Text style={styles.metaText}>約 {formatOccurredAt(message.occurredAt)} 發生</Text>
                  <Text style={styles.metaTextHint}>發送者回報的大約時間</Text>
                </View>
              </View>
            )}
            {message.location && (
              <TouchableOpacity
                style={styles.metaRow}
                onPress={() => openLocationInMaps(message.location!)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color={colors.primary.DEFAULT} />
                <Text style={styles.metaTextLink}>於 {message.location} 附近</Text>
                <Ionicons name="open-outline" size={14} color={colors.primary.DEFAULT} />
              </TouchableOpacity>
            )}
            <View style={styles.metaRow}>
              <Ionicons name="send-outline" size={16} color={colors.muted.foreground} />
              <Text style={styles.metaText}>提醒發送於 {formatDate(message.createdAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={16} color={colors.muted.foreground} />
              <Text style={styles.metaText}>
                來自：{message.sender?.nickname || '匿名用戶'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsCard}>
            {message.sender?.id && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowBlockModal(true)}
              >
                <Ionicons name="ban-outline" size={16} color={colors.muted.foreground} />
                <Text style={styles.actionText}>封鎖用戶</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowReportModal(true)}
            >
              <Ionicons name="flag-outline" size={16} color={colors.muted.foreground} />
              <Text style={styles.actionText}>檢舉訊息</Text>
            </TouchableOpacity>
          </View>

          {/* Reply Section */}
          {message.replyText ? (
            <View style={styles.replySection}>
              <Text style={styles.sectionTitle}>您的回覆</Text>
              <View style={styles.replyCard}>
                <Ionicons name="chatbubble-outline" size={16} color={colors.secondary.DEFAULT} />
                <Text style={styles.replyText}>{message.replyText}</Text>
              </View>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.confirmButtonText}>確定</Text>
              </TouchableOpacity>
            </View>
          ) : !showCustomReply && !aiSuggestion ? (
            <View style={styles.replySection}>
              <Text style={styles.sectionTitle}>回覆</Text>
              <TouchableOpacity
                style={styles.quickReplyButton}
                onPress={handleQuickReply}
                disabled={isReplying}
              >
                <Text style={styles.quickReplyText}>
                  {isReplying ? '處理中...' : getQuickReplyText()}
                </Text>
                {!isReplying && (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>0 點</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customReplyButton}
                onPress={() => setShowCustomReply(true)}
              >
                <Text style={styles.customReplyButtonText}>自訂回覆</Text>
              </TouchableOpacity>
            </View>
          ) : showCustomReply && !aiSuggestion ? (
            <View style={styles.replySection}>
              <Text style={styles.sectionTitle}>自訂回覆</Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.replyInput}
                  value={customReplyText}
                  onChangeText={(text) => setCustomReplyText(text.slice(0, 100))}
                  placeholder="輸入您的回覆（5-100字）"
                  placeholderTextColor={colors.muted.foreground}
                  multiline
                  maxLength={100}
                />
                <Text
                  style={[
                    styles.charCount,
                    customReplyText.length > 0 && customReplyText.length < 5 && styles.charCountError,
                  ]}
                >
                  {customReplyText.length}/100
                </Text>
              </View>

              {customReplyText.trim().length >= 5 && (
                <View style={styles.aiLimitCard}>
                  <View style={styles.aiLimitRow}>
                    <Ionicons name="sparkles" size={16} color={colors.primary.DEFAULT} />
                    <Text style={styles.aiLimitLabel}>AI 協助改寫</Text>
                  </View>
                  {aiLimit.canUse ? (
                    <Text style={styles.aiLimitValue}>今日剩餘 {aiLimit.remaining}/5 次</Text>
                  ) : (
                    <Text style={styles.aiLimitExhausted}>今日已用完</Text>
                  )}
                </View>
              )}

              {customReplyText.length > 0 && customReplyText.length < 5 && (
                <View style={styles.errorCard}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>回覆內容至少需要 5 個字</Text>
                </View>
              )}

              {customReplyText.trim().length >= 5 && (
                <>
                  {aiLimit.canUse ? (
                    <TouchableOpacity
                      style={[styles.aiAssistButton, isLoadingAi && styles.buttonDisabled]}
                      onPress={handleGetAiSuggestion}
                      disabled={isLoadingAi}
                    >
                      <View style={styles.buttonContent}>
                        <Ionicons name="sparkles" size={20} color={colors.primary.foreground} />
                        <Text style={styles.primaryButtonText}>
                          {isLoadingAi ? '處理中...' : 'AI 協助改寫'}
                        </Text>
                      </View>
                      <View style={styles.remainingBadge}>
                        <Text style={styles.remainingBadgeText}>剩 {aiLimit.remaining} 次</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.aiExhaustedCard}>
                      <View style={styles.aiExhaustedRow}>
                        <Ionicons name="alert-circle" size={16} color="#DC2626" />
                        <Text style={styles.aiExhaustedTitle}>AI 已達今日上限</Text>
                      </View>
                      <Text style={styles.aiExhaustedText}>每日限制 5 次，明天會自動重置</Text>
                    </View>
                  )}

                  {canAfford(4) ? (
                    <TouchableOpacity
                      style={[styles.secondaryButton, isReplying && styles.buttonDisabled]}
                      onPress={() => handleCustomReply(false)}
                      disabled={isReplying}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {isReplying ? '處理中...' : '直接送出'}
                      </Text>
                      <View style={styles.pointBadgeSecondary}>
                        <Text style={styles.pointBadgeSecondaryText}>4 點</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.insufficientCard}>
                      <Text style={styles.insufficientText}>直接送出需要 4 點（點數不足）</Text>
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity style={styles.cancelButton} onPress={resetCustomReply}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>

              {/* Points Info */}
              <View style={styles.pointsInfoCard}>
                <View style={styles.pointsRow}>
                  <Text style={styles.pointsLabel}>快速回覆</Text>
                  <Text style={styles.pointsFree}>0 點</Text>
                </View>
                <View style={styles.pointsRow}>
                  <Text style={styles.pointsLabel}>自訂回覆（AI 協助）</Text>
                  <Text style={styles.pointsValue}>2 點</Text>
                </View>
                <View style={styles.pointsRow}>
                  <Text style={styles.pointsLabel}>自訂回覆（不用 AI）</Text>
                  <Text style={styles.pointsValue}>4 點</Text>
                </View>
              </View>
            </View>
          ) : showCustomReply && aiSuggestion ? (
            <View style={styles.replySection}>
              <Text style={styles.sectionTitle}>AI 建議版本</Text>

              {/* Original */}
              <View style={styles.originalSection}>
                <Text style={styles.versionLabel}>原本的版本</Text>
                <View style={styles.originalCard}>
                  <Text style={styles.originalText}>{customReplyText}</Text>
                </View>
              </View>

              {/* AI Suggestion */}
              <View style={styles.aiSuggestionSection}>
                <Text style={styles.versionLabel}>AI 建議版本</Text>
                <View style={styles.aiSuggestionCard}>
                  <Ionicons name="sparkles" size={16} color={colors.primary.DEFAULT} />
                  <Text style={styles.aiSuggestionText}>{aiSuggestion}</Text>
                </View>
              </View>

              {/* Actions */}
              {canAfford(2) ? (
                <TouchableOpacity
                  style={[styles.primaryButton, isReplying && styles.buttonDisabled]}
                  onPress={() => handleCustomReply(true)}
                  disabled={isReplying}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="sparkles" size={20} color={colors.primary.foreground} />
                    <Text style={styles.primaryButtonText}>
                      {isReplying ? '處理中...' : '用 AI 版送出'}
                    </Text>
                  </View>
                  <View style={styles.pointBadgePrimary}>
                    <Text style={styles.pointBadgePrimaryText}>2 點</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.insufficientCard}>
                  <View style={styles.insufficientRow}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.insufficientTitle}>點數不足</Text>
                  </View>
                  <Text style={styles.insufficientDetail}>
                    目前剩餘 {getTotalPoints(user)} 點，使用 AI 協助需要 2 點
                  </Text>
                </View>
              )}

              {canAfford(4) ? (
                <TouchableOpacity
                  style={[styles.secondaryButton, isReplying && styles.buttonDisabled]}
                  onPress={() => handleCustomReply(false)}
                  disabled={isReplying}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isReplying ? '處理中...' : '用原版送出'}
                  </Text>
                  <View style={styles.pointBadgeSecondary}>
                    <Text style={styles.pointBadgeSecondaryText}>4 點</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.insufficientCard}>
                  <Text style={styles.insufficientText}>原版需要 4 點（點數不足）</Text>
                </View>
              )}

              <TouchableOpacity style={styles.cancelButton} onPress={resetCustomReply}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Block Modal */}
      <Modal visible={showBlockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>封鎖用戶</Text>
            <Text style={styles.modalDescription}>
              確定要封鎖「{message?.sender?.nickname || '匿名'}」嗎？封鎖後您將無法發送也無法接收該用戶的提醒。
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowBlockModal(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleBlockSender}
              >
                <Text style={styles.modalConfirmText}>確認封鎖</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>檢舉訊息內容</Text>
            <Text style={styles.modalDescription}>
              檢舉此訊息將提交給管理員審核。請說明檢舉原因（選填）。
            </Text>
            <View style={styles.reportInputContainer}>
              <Text style={styles.reportInputLabel}>檢舉原因（選填）</Text>
              <TextInput
                style={styles.reportInput}
                value={reportReason}
                onChangeText={setReportReason}
                placeholder="請說明檢舉原因..."
                placeholderTextColor={colors.muted.foreground}
                multiline
                maxLength={200}
              />
              <Text style={styles.reportCharCount}>{reportReason.length}/200</Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleReportMessage}
                disabled={isReporting}
              >
                <Text style={styles.modalConfirmText}>
                  {isReporting ? '提交中...' : '確認檢舉'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    headerTitleCenter: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
    },
    headerRight: {
      width: 80,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      padding: spacing[1],
      zIndex: 1,
    },
    backText: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Detail View
    detailContent: {
      flex: 1,
    },
    detailContentContainer: {
      padding: spacing[6],
      gap: spacing[4],
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    typeBadge: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: borderRadius.md,
    },
    typeBadgeText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
    },
    detailTime: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
    },
    detailCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: borderRadius.lg,
      padding: spacing[4],
      borderWidth: 1,
      borderColor: colors.borderSolid,
      borderLeftWidth: 3,
    },
    templateText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
      lineHeight: typography.fontSize.lg * typography.lineHeight.relaxed,
    },
    customTextSection: {
      marginTop: spacing[4],
      paddingTop: spacing[4],
      borderTopWidth: 1,
      borderTopColor: colors.borderSolid,
    },
    sectionLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
      marginBottom: spacing[1],
    },
    customTextValue: {
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
      lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
    },

    // Meta Card
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
    metaText: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
    },
    metaTextColumn: {
      flex: 1,
      gap: spacing[0.5],
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

    // Actions Card
    actionsCard: {
      flexDirection: 'row',
      gap: spacing[4],
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
    },
    actionText: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
    },

    // Reply Section
    replySection: {
      gap: spacing[3],
    },
    sectionTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },
    replyCard: {
      backgroundColor: `${colors.secondary.DEFAULT}10`,
      borderWidth: 1,
      borderColor: `${colors.secondary.DEFAULT}30`,
      borderRadius: borderRadius.lg,
      padding: spacing[3],
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
    },
    replyText: {
      flex: 1,
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
      lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
    },
    confirmButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing[3],
      alignItems: 'center',
    },
    confirmButtonText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.foreground,
    },
    quickReplyButton: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing[3.5],
      paddingHorizontal: spacing[4],
    },
    quickReplyText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.foreground,
    },
    freeBadge: {
      position: 'absolute',
      right: spacing[4],
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
    },
    freeBadgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold as any,
      color: colors.primary.foreground,
    },
    customReplyButton: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 2,
      borderColor: colors.borderSolid,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing[3],
      alignItems: 'center',
    },
    customReplyButtonText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },

    // Custom Reply Input
    inputContainer: {
      position: 'relative',
    },
    replyInput: {
      backgroundColor: colors.input.background,
      borderWidth: 1,
      borderColor: colors.input.border,
      borderRadius: borderRadius.lg,
      padding: spacing[3],
      paddingRight: spacing[12],
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    charCount: {
      position: 'absolute',
      right: spacing[3],
      bottom: spacing[3],
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },
    charCountError: {
      color: isDark ? '#F87171' : '#DC2626',
    },

    // AI Limit
    aiLimitCard: {
      backgroundColor: isDark ? 'rgba(90, 143, 212, 0.1)' : `${colors.primary.DEFAULT}08`,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(90, 143, 212, 0.3)' : `${colors.primary.DEFAULT}30`,
      borderRadius: borderRadius.lg,
      padding: spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    aiLimitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    aiLimitLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
    },
    aiLimitValue: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.DEFAULT,
    },
    aiLimitExhausted: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium as any,
      color: isDark ? '#F87171' : '#DC2626',
    },

    // Error Card
    errorCard: {
      backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248, 113, 113, 0.3)' : '#FECACA',
      borderRadius: borderRadius.lg,
      padding: spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    errorText: {
      fontSize: typography.fontSize.sm,
      color: isDark ? '#F87171' : '#DC2626',
    },

    // Primary Button (with point badge)
    primaryButton: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing[3.5],
      paddingHorizontal: spacing[4],
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    primaryButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.primary.foreground,
    },
    pointBadgePrimary: {
      position: 'absolute',
      right: spacing[4],
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
    },
    pointBadgePrimaryText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold as any,
      color: colors.primary.foreground,
    },

    // AI Assist Button (with remaining count badge)
    aiAssistButton: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing[3.5],
      paddingHorizontal: spacing[4],
    },
    remainingBadge: {
      position: 'absolute',
      right: spacing[4],
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
    },
    remainingBadgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold as any,
      color: colors.primary.foreground,
    },

    // Secondary Button (with point badge)
    secondaryButton: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing[3.5],
      paddingHorizontal: spacing[4],
    },
    secondaryButtonText: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },
    pointBadgeSecondary: {
      position: 'absolute',
      right: spacing[4],
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
    },
    pointBadgeSecondaryText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold as any,
      color: colors.muted.foreground,
    },
    buttonDisabled: {
      opacity: 0.5,
    },

    // AI Exhausted
    aiExhaustedCard: {
      backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248, 113, 113, 0.3)' : '#FECACA',
      borderRadius: borderRadius.lg,
      padding: spacing[3],
    },
    aiExhaustedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      marginBottom: spacing[1],
    },
    aiExhaustedTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: isDark ? '#F87171' : '#DC2626',
    },
    aiExhaustedText: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },

    // Insufficient Card
    insufficientCard: {
      backgroundColor: colors.muted.DEFAULT,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      borderRadius: borderRadius.lg,
      padding: spacing[3],
      alignItems: 'center',
    },
    insufficientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      marginBottom: spacing[1],
    },
    insufficientTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: isDark ? '#F87171' : '#DC2626',
    },
    insufficientText: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },
    insufficientDetail: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },

    // Cancel Button
    cancelButton: {
      paddingVertical: spacing[2.5],
      alignItems: 'center',
    },
    cancelText: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
    },

    // Points Info
    pointsInfoCard: {
      backgroundColor: colors.muted.DEFAULT,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      borderRadius: borderRadius.lg,
      padding: spacing[4],
      gap: spacing[2],
    },
    pointsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    pointsLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
    },
    pointsFree: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.secondary.DEFAULT,
    },
    pointsValue: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },

    // AI Suggestion Section
    originalSection: {
      gap: spacing[2],
    },
    versionLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
    },
    originalCard: {
      backgroundColor: colors.muted.DEFAULT,
      borderWidth: 1,
      borderColor: colors.borderSolid,
      borderRadius: borderRadius.lg,
      padding: spacing[3],
    },
    originalText: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
      textDecorationLine: 'line-through',
    },
    aiSuggestionSection: {
      gap: spacing[2],
    },
    aiSuggestionCard: {
      backgroundColor: isDark ? 'rgba(90, 143, 212, 0.1)' : `${colors.primary.DEFAULT}08`,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(90, 143, 212, 0.3)' : `${colors.primary.DEFAULT}30`,
      borderRadius: borderRadius.lg,
      padding: spacing[3],
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
    },
    aiSuggestionText: {
      flex: 1,
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
      lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
    },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing[6],
    },
    modalContent: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: borderRadius.lg,
      padding: spacing[6],
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold as any,
      color: colors.foreground,
      marginBottom: spacing[2],
    },
    modalDescription: {
      fontSize: typography.fontSize.sm,
      color: colors.muted.foreground,
      lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
      marginBottom: spacing[4],
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing[3],
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing[3],
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: colors.foreground,
    },
    modalConfirmButton: {
      flex: 1,
      backgroundColor: isDark ? '#E57373' : '#DC2626',
      borderRadius: borderRadius.lg,
      paddingVertical: spacing[3],
      alignItems: 'center',
    },
    modalConfirmText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium as any,
      color: '#FFFFFF',
    },
    reportInputContainer: {
      marginBottom: spacing[4],
    },
    reportInputLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
      marginBottom: spacing[2],
    },
    reportInput: {
      backgroundColor: colors.input.background,
      borderWidth: 1,
      borderColor: colors.input.border,
      borderRadius: borderRadius.lg,
      padding: spacing[3],
      fontSize: typography.fontSize.sm,
      color: colors.foreground,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    reportCharCount: {
      fontSize: typography.fontSize.xs,
      color: colors.muted.foreground,
      textAlign: 'right',
      marginTop: spacing[1],
    },
  });
