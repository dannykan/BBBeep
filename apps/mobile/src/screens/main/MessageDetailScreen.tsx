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
                <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
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
              <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitleCenter}>訊息詳情</Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.detailContent}
          contentContainerStyle={styles.detailContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
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
    headerTitleCenter: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
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
      gap: 4,
      padding: 4,
      zIndex: 1,
    },
    backText: {
      fontSize: 14,
      color: colors.text.secondary,
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
      padding: 24,
      gap: 16,
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    typeBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    typeBadgeText: {
      fontSize: 13,
      fontWeight: '600',
    },
    detailTime: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    detailCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
    },
    templateText: {
      fontSize: 17,
      fontWeight: '500',
      color: colors.text.primary,
      lineHeight: 26,
    },
    customTextSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sectionLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: 6,
    },
    customTextValue: {
      fontSize: 14,
      color: colors.text.primary,
      lineHeight: 22,
    },

    // Meta Card
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
    metaText: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    metaTextColumn: {
      flex: 1,
      gap: 2,
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

    // Actions Card
    actionsCard: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 4,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionText: {
      fontSize: 13,
      color: colors.text.secondary,
    },

    // Reply Section
    replySection: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    replyCard: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : '#DCFCE7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#BBF7D0',
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    replyText: {
      flex: 1,
      fontSize: 14,
      color: colors.text.primary,
      lineHeight: 22,
    },
    confirmButton: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    confirmButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    quickReplyButton: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    quickReplyText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    freeBadge: {
      position: 'absolute',
      right: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    freeBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    customReplyButton: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    customReplyButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },

    // Custom Reply Input
    inputContainer: {
      position: 'relative',
    },
    replyInput: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      paddingRight: 50,
      fontSize: 14,
      color: colors.text.primary,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    charCount: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      fontSize: 11,
      color: colors.text.secondary,
    },
    charCountError: {
      color: isDark ? '#F87171' : '#DC2626',
    },

    // AI Limit
    aiLimitCard: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    aiLimitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    aiLimitLabel: {
      fontSize: 13,
      color: colors.text.primary,
    },
    aiLimitValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
    },
    aiLimitExhausted: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#F87171' : '#DC2626',
    },

    // Error Card
    errorCard: {
      backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248, 113, 113, 0.3)' : '#FECACA',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorText: {
      fontSize: 13,
      color: isDark ? '#F87171' : '#DC2626',
    },

    // Primary Button (with point badge)
    primaryButton: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    pointBadgePrimary: {
      position: 'absolute',
      right: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pointBadgePrimaryText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // AI Assist Button (with remaining count badge)
    aiAssistButton: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    remainingBadge: {
      position: 'absolute',
      right: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    remainingBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // Secondary Button (with point badge)
    secondaryButton: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    pointBadgeSecondary: {
      position: 'absolute',
      right: 16,
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pointBadgeSecondaryText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.secondary,
    },
    buttonDisabled: {
      opacity: 0.5,
    },

    // AI Exhausted
    aiExhaustedCard: {
      backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248, 113, 113, 0.3)' : '#FECACA',
      borderRadius: 12,
      padding: 14,
    },
    aiExhaustedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    aiExhaustedTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#F87171' : '#DC2626',
    },
    aiExhaustedText: {
      fontSize: 12,
      color: colors.text.secondary,
    },

    // Insufficient Card
    insufficientCard: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    insufficientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    insufficientTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#F87171' : '#DC2626',
    },
    insufficientText: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    insufficientDetail: {
      fontSize: 12,
      color: colors.text.secondary,
    },

    // Cancel Button
    cancelButton: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 14,
      color: colors.text.secondary,
    },

    // Points Info
    pointsInfoCard: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    pointsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    pointsLabel: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    pointsFree: {
      fontSize: 13,
      fontWeight: '600',
      color: '#22C55E',
    },
    pointsValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
    },

    // AI Suggestion Section
    originalSection: {
      gap: 8,
    },
    versionLabel: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    originalCard: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
    },
    originalText: {
      fontSize: 14,
      color: colors.text.secondary,
      textDecorationLine: 'line-through',
    },
    aiSuggestionSection: {
      gap: 8,
    },
    aiSuggestionCard: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    aiSuggestionText: {
      flex: 1,
      fontSize: 14,
      color: colors.text.primary,
      lineHeight: 22,
    },

    // Modals
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
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    modalDescription: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 22,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    modalConfirmButton: {
      flex: 1,
      backgroundColor: isDark ? '#E57373' : '#DC2626',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    modalConfirmText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    reportInputContainer: {
      marginBottom: 20,
    },
    reportInputLabel: {
      fontSize: 14,
      color: colors.text.primary,
      marginBottom: 8,
    },
    reportInput: {
      backgroundColor: colors.card.DEFAULT,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      fontSize: 14,
      color: colors.text.primary,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    reportCharCount: {
      fontSize: 11,
      color: colors.text.secondary,
      textAlign: 'right',
      marginTop: 6,
    },
  });
