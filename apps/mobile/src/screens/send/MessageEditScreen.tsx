/**
 * Message Edit Screen
 * 整合情境選擇 + 訊息編輯 + 語音錄音 + 發送方式（優化版 Step 3）
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
} from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, CompactStepHeader } from './components';
import { displayLicensePlate, uploadApi, activitiesApi } from '@bbbeeep/shared';
import {
  getSituationsByVehicleType,
  getMessageByVehicleType,
} from '../../data/vehicleTemplates';
import { typography, spacing, borderRadius } from '../../theme';

type Props = NativeStackScreenProps<SendStackParamList, 'MessageEdit'>;

const MAX_RECORDING_DURATION = 15;
const MIN_CHARS = 5;
const MAX_CHARS = 100;

export default function MessageEditScreen({ navigation, route }: Props) {
  const {
    vehicleType,
    targetPlate,
    selectedCategory,
    setSelectedSituation,
    setGeneratedMessage,
    customText,
    setCustomText,
    setUseAiVersion,
    setSendMode,
    aiLimit,
    checkAiModeration,
    checkVoiceModeration,
    checkTextModeration,
    getCombinedModerationWarning,
    aiModeration,
    isAiModerating,
    voiceRecording,
    setVoiceRecording,
    clearVoice,
    validateContent,
    optimizeWithAi,
    setAiSuggestion,
  } = useSend();
  const { colors, isDark } = useTheme();

  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [templateMessage, setTemplateMessage] = useState(''); // 紀錄原始模板訊息
  const [isUsingTemplate, setIsUsingTemplate] = useState(false); // 是否使用未編輯的模板

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // AI optimization state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [aiOptimizedText, setAiOptimizedText] = useState('');
  const [originalTextBeforeAi, setOriginalTextBeforeAi] = useState('');

  // Track original voice transcript for comparison
  const voiceTranscriptRef = useRef<string>('');

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 保存錄音前的狀態，用於取消時恢復
  const previousMessageRef = useRef<string>('');
  const previousVoiceRef = useRef<typeof voiceRecording>(null);

  // Get situations for current category
  const situations = selectedCategory
    ? getSituationsByVehicleType(vehicleType!, selectedCategory)
    : [];

  // Cleanup on unmount (不在這裡檢查權限，改為點擊麥克風時才檢查)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // AI moderation check with debounce (只在編輯過訊息時才檢查)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // 如果是使用未編輯的模板，不需要 AI 審核
    if (isUsingTemplate) {
      return;
    }

    if (message.trim().length >= MIN_CHARS) {
      debounceRef.current = setTimeout(() => {
        // 如果有語音且文字與語音轉文字不同，則分別審核
        if (voiceRecording && message !== voiceTranscriptRef.current) {
          checkTextModeration(message);
        } else {
          checkAiModeration(message);
        }
      }, 800);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [message, checkAiModeration, checkTextModeration, isUsingTemplate, voiceRecording]);

  const checkPermissions = async (): Promise<boolean> => {
    try {
      const { status, canAskAgain } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
      return false;
    }
  };

  // 顯示前往設定的對話框
  const showPermissionDeniedAlert = () => {
    Alert.alert(
      '需要麥克風權限',
      '您之前拒絕了麥克風權限。\n\n請前往「設定」→「UBeep」→ 開啟「麥克風」權限。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '前往設定',
          onPress: async () => {
            // 使用 iOS 專用 URL scheme 直接開啟 App 設定頁面
            if (Platform.OS === 'ios') {
              await Linking.openURL('app-settings:');
            } else {
              await Linking.openSettings();
            }
          },
        },
      ]
    );
  };

  // 當選擇情境時，自動填入訊息
  const handleSelectSituation = useCallback(
    (situationId: string) => {
      setSelectedSituationId(situationId);
      setSelectedSituation(situationId);

      // Get template message
      const template = getMessageByVehicleType(
        vehicleType!,
        situationId,
      );
      setMessage(template);
      setTemplateMessage(template);
      setGeneratedMessage(template);
      setIsUsingTemplate(true); // 標記為使用模板
    },
    [vehicleType, setSelectedSituation, setGeneratedMessage],
  );

  // 當用戶手動編輯訊息時，檢查是否與模板不同
  const handleMessageChange = useCallback(
    (text: string) => {
      setMessage(text);
      // 如果訊息與模板不同，或沒有選擇模板，則標記為非模板模式
      if (templateMessage && text !== templateMessage) {
        setIsUsingTemplate(false);
      } else if (templateMessage && text === templateMessage) {
        setIsUsingTemplate(true);
      }
    },
    [templateMessage],
  );

  // Recording functions
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const startRecording = async () => {
    // 點擊麥克風時才檢查權限（Just-in-time permission）
    try {
      const { status, canAskAgain } = await Audio.getPermissionsAsync();

      if (status !== 'granted') {
        if (canAskAgain) {
          // 還可以詢問，嘗試請求權限
          const { status: newStatus } = await Audio.requestPermissionsAsync();
          if (newStatus !== 'granted') {
            // 用戶這次拒絕了
            return;
          }
          setHasPermission(true);
        } else {
          // 之前已經拒絕過，無法再詢問，引導去設定
          showPermissionDeniedAlert();
          return;
        }
      } else {
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      Alert.alert('錯誤', '無法檢查麥克風權限');
      return;
    }

    try {
      // 保存當前狀態，以便取消時恢復
      previousMessageRef.current = message;
      previousVoiceRef.current = voiceRecording;

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
      setPlaybackPosition(0);

      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {}
        recordingRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;

      setIsRecording(true);
      setRecordingDuration(0);
      startPulseAnimation();

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= MAX_RECORDING_DURATION - 1) {
            stopRecording();
            return MAX_RECORDING_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('錯誤', '無法開始錄音，請稍後再試');
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !recordingRef.current) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopPulseAnimation();

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setIsRecording(false);

      if (uri && recordingDuration > 0) {
        // 先設定新的語音錄音（不含 transcript）
        const newRecording = {
          uri,
          duration: recordingDuration,
          transcript: '',
        };
        setVoiceRecording(newRecording);

        // 傳遞新錄音資訊給 transcribeVoice，避免 closure 問題
        await transcribeVoice(uri, newRecording);
      }

      recordingRef.current = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      recordingRef.current = null;
    }
  };

  const cancelRecording = async () => {
    if (!isRecording || !recordingRef.current) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopPulseAnimation();

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setIsRecording(false);
      setRecordingDuration(0);
      recordingRef.current = null;

      // 恢復取消前的狀態
      setMessage(previousMessageRef.current);
      if (previousVoiceRef.current) {
        setVoiceRecording(previousVoiceRef.current);
      }
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      setIsRecording(false);
      recordingRef.current = null;
      // 即使發生錯誤也嘗試恢復狀態
      setMessage(previousMessageRef.current);
      if (previousVoiceRef.current) {
        setVoiceRecording(previousVoiceRef.current);
      }
    }
  };

  const transcribeVoice = async (uri: string, recording: { uri: string; duration: number; transcript: string }) => {
    setIsTranscribing(true);
    try {
      const result = await uploadApi.transcribeVoice(uri);
      if (result.text) {
        setMessage(result.text);
        setCustomText(result.text);
        setIsUsingTemplate(false); // 語音錄音不是模板模式
        // 保存語音轉文字內容以便後續比較
        voiceTranscriptRef.current = result.text;
        // 使用傳入的 recording 參數，而非 closure 中的 voiceRecording
        setVoiceRecording({
          ...recording,
          transcript: result.text,
        });

        // 審核語音轉文字內容
        checkVoiceModeration(result.text);

        // 背景記錄錄音完成活動（不阻塞 UI）
        activitiesApi.recordRecording({
          voiceUrl: uri,
          voiceDuration: recording.duration,
          transcript: result.text,
          targetPlate: targetPlate,
          vehicleType: vehicleType || undefined,
          category: selectedCategory || undefined,
        }).catch((err) => {
          console.log('[Activity] Failed to log RECORDING_COMPLETE:', err);
        });
      }
    } catch (error: any) {
      console.error('Transcription failed:', error);
      Alert.alert('轉文字失敗', '語音轉文字失敗，請手動輸入或重新錄音');
    } finally {
      setIsTranscribing(false);
    }
  };

  const clearRecording = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackPosition(0);
    clearVoice();
  };

  // Playback functions
  const playRecording = async () => {
    if (!voiceRecording?.uri) return;

    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: voiceRecording.uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.error('Playback failed:', error);
      Alert.alert('錯誤', '無法播放錄音');
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPlaybackPosition(Math.floor(status.positionMillis / 1000));
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        if (soundRef.current) {
          soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 背景記錄活動（不阻塞用戶流程）
  const logActivity = useCallback(async (
    type: 'TEXT_EDIT' | 'AI_OPTIMIZE',
    sendMode: string,
  ) => {
    try {
      await activitiesApi.recordTextEdit({
        messageText: message,
        targetPlate: targetPlate,
        vehicleType: vehicleType || undefined,
        category: selectedCategory || undefined,
        sendMode,
        aiModerationResult: aiModeration || undefined,
      });
    } catch (error) {
      // 靜默失敗，不影響用戶體驗
      console.log('[Activity] Failed to log:', error);
    }
  }, [message, targetPlate, vehicleType, selectedCategory, aiModeration]);

  // Submit handlers
  const handleVoiceSubmit = () => {
    if (!voiceRecording) return;
    setCustomText(message);
    setSendMode('voice');
    setUseAiVersion(false);
    // 背景記錄活動
    logActivity('TEXT_EDIT', 'voice');
    navigation.navigate('Confirm');
  };

  const handleTemplateSubmit = () => {
    // 使用模板發送，不需要額外驗證（模板本身是安全的）
    setCustomText(message);
    setSendMode('template');
    setUseAiVersion(false);
    // 背景記錄活動
    logActivity('TEXT_EDIT', 'template');
    navigation.navigate('Confirm');
  };

  const handleTextSubmit = () => {
    if (message.trim().length < MIN_CHARS) {
      Alert.alert('訊息太短', `請至少輸入 ${MIN_CHARS} 個字`);
      return;
    }
    const validation = validateContent(message);
    if (!validation.isValid) {
      Alert.alert('內容不當', validation.message || '請修改內容後再試');
      return;
    }
    setCustomText(message);
    setSendMode('text');
    setUseAiVersion(false);
    // 背景記錄活動
    logActivity('TEXT_EDIT', 'text');
    navigation.navigate('Confirm');
  };

  const handleAiSubmit = async () => {
    if (message.trim().length < MIN_CHARS) {
      Alert.alert('訊息太短', `請至少輸入 ${MIN_CHARS} 個字`);
      return;
    }

    setIsOptimizing(true);

    try {
      // 呼叫 AI 優化 API
      const optimizedText = await optimizeWithAi(message);

      if (optimizedText) {
        // 保存原始訊息，顯示 AI 優化預覽
        setOriginalTextBeforeAi(message);
        setAiOptimizedText(optimizedText);
        setShowAiPreview(true);
      } else {
        Alert.alert('優化失敗', 'AI 優化失敗，請稍後再試或使用文字發送');
      }
    } catch (error) {
      console.error('AI optimization failed:', error);
      Alert.alert('優化失敗', 'AI 優化失敗，請稍後再試或使用文字發送');
    } finally {
      setIsOptimizing(false);
    }
  };

  // 確認使用 AI 優化版本
  const handleConfirmAiVersion = () => {
    setCustomText(originalTextBeforeAi); // 保存原始訊息
    setAiSuggestion(aiOptimizedText); // 設定 AI 優化後的訊息
    setSendMode('ai');
    setUseAiVersion(true);
    // 背景記錄活動
    logActivity('AI_OPTIMIZE', 'ai');
    navigation.navigate('Confirm');
  };

  // 取消 AI 優化，返回編輯
  const handleCancelAiPreview = () => {
    setShowAiPreview(false);
    setAiOptimizedText('');
    setOriginalTextBeforeAi('');
  };

  const trimmedLength = message.trim().length;
  const isValidLength = trimmedLength >= MIN_CHARS;
  const hasVoice = voiceRecording !== null;
  // 如果有語音錄音，則不再是使用模板模式
  const effectiveIsUsingTemplate = isUsingTemplate && !hasVoice;
  // 模板模式不需要等待 AI 審核
  const canProceed = isValidLength && !isRecording && !isTranscribing && !isOptimizing &&
    (effectiveIsUsingTemplate || !isAiModerating);

  // 取得合併的審核警告
  const combinedWarning = getCombinedModerationWarning();
  // AI 審核通過（沒有任何問題）
  const aiModerationPassed = !effectiveIsUsingTemplate && !isAiModerating &&
    aiModeration?.isAppropriate && !combinedWarning.hasIssue;

  // Get category display info
  const getCategoryInfo = () => {
    switch (selectedCategory) {
      case '車況提醒':
        return { icon: vehicleType === 'car' ? 'car' : 'motorcycle', iconFamily: 'fontawesome' };
      case '行車安全':
        return { icon: 'warning-outline', iconFamily: 'ionicons' };
      case '讚美感謝':
        return { icon: 'heart-outline', iconFamily: 'ionicons' };
      default:
        return { icon: 'chatbubble-outline', iconFamily: 'ionicons' };
    }
  };

  const categoryInfo = getCategoryInfo();

  return (
    <SendLayout currentStep={3} totalSteps={4}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with plate and category */}
          <View style={styles.headerRow}>
            <View style={[styles.plateHeader, { backgroundColor: colors.card.DEFAULT }]}>
              <FontAwesome6
                name={vehicleType === 'car' ? 'car' : 'motorcycle'}
                size={14}
                color={colors.primary.DEFAULT}
              />
              <Text style={[styles.plateText, { color: colors.foreground }]}>
                {displayLicensePlate(targetPlate)}
              </Text>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: colors.card.DEFAULT }]}>
              {categoryInfo.iconFamily === 'ionicons' ? (
                <Ionicons name={categoryInfo.icon as any} size={14} color={colors.primary.DEFAULT} />
              ) : (
                <FontAwesome6 name={categoryInfo.icon as any} size={12} color={colors.primary.DEFAULT} />
              )}
              <Text style={[styles.categoryBadgeText, { color: colors.foreground }]}>
                {selectedCategory}
              </Text>
            </View>
          </View>

          <CompactStepHeader
            title="編輯提醒內容"
            subtitle="選擇情境或直接輸入/錄音"
          />

          {/* Situation chips */}
          {situations.length > 0 && !isRecording && !isTranscribing && (
            <View style={styles.situationSection}>
              <Text style={[styles.sectionLabel, { color: colors.muted.foreground }]}>
                快速選擇情境
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.situationScroll}
              >
                {situations.map((situation) => (
                  <TouchableOpacity
                    key={situation.id}
                    style={[
                      styles.situationChip,
                      {
                        backgroundColor:
                          selectedSituationId === situation.id
                            ? colors.primary.DEFAULT
                            : colors.card.DEFAULT,
                        borderColor:
                          selectedSituationId === situation.id
                            ? colors.primary.DEFAULT
                            : colors.borderSolid,
                      },
                    ]}
                    onPress={() => handleSelectSituation(situation.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.situationChipText,
                        {
                          color:
                            selectedSituationId === situation.id
                              ? colors.primary.foreground
                              : colors.foreground,
                        },
                      ]}
                    >
                      {situation.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Recording UI */}
          {isRecording && (
            <View style={[styles.recordingOverlay, { backgroundColor: colors.card.DEFAULT }]}>
              <View style={styles.recordingHeader}>
                <Animated.View
                  style={[
                    styles.recordingIndicator,
                    { backgroundColor: colors.destructive.DEFAULT },
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <Text style={[styles.recordingTime, { color: colors.foreground }]}>
                  {formatDuration(recordingDuration)} / {formatDuration(MAX_RECORDING_DURATION)}
                </Text>
              </View>

              <Text style={[styles.recordingHint, { color: colors.muted.foreground }]}>
                正在錄音中...
              </Text>

              <View style={styles.recordingControls}>
                <TouchableOpacity
                  style={[styles.recordingButton, { backgroundColor: colors.muted.DEFAULT }]}
                  onPress={cancelRecording}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={colors.muted.foreground} />
                  <Text style={[styles.recordingButtonText, { color: colors.muted.foreground }]}>取消</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.recordingButton, { backgroundColor: colors.destructive.DEFAULT }]}
                  onPress={stopRecording}
                  activeOpacity={0.7}
                >
                  <View style={styles.stopIcon} />
                  <Text style={[styles.recordingButtonText, { color: '#FFFFFF' }]}>完成</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Transcribing indicator */}
          {isTranscribing && (
            <View style={[styles.transcribingBox, { backgroundColor: colors.muted.DEFAULT }]}>
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
              <Text style={[styles.transcribingText, { color: colors.muted.foreground }]}>
                AI 正在轉換文字...
              </Text>
            </View>
          )}

          {/* Message input (hidden during recording/transcribing) */}
          {!isRecording && !isTranscribing && (
            <>
              <View style={styles.messageSection}>
                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                  訊息內容
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.messageInput,
                      {
                        backgroundColor: colors.card.DEFAULT,
                        borderColor: colors.borderSolid,
                        color: colors.foreground,
                      },
                    ]}
                    value={message}
                    onChangeText={handleMessageChange}
                    placeholder="輸入要傳達的訊息，或按右下角錄音..."
                    placeholderTextColor={colors.muted.foreground}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={MAX_CHARS}
                  />

                  {/* Mic button */}
                  <TouchableOpacity
                    style={[styles.micButton, { backgroundColor: colors.primary.DEFAULT }]}
                    onPress={startRecording}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="mic" size={24} color={colors.primary.foreground} />
                  </TouchableOpacity>
                </View>

                <View style={styles.messageFooter}>
                  <Text style={[styles.micHint, { color: colors.muted.foreground }]}>
                    <Ionicons name="mic-outline" size={12} /> 點擊錄音，AI 自動轉文字
                  </Text>
                  <Text style={[styles.charCount, { color: colors.muted.foreground }]}>
                    {trimmedLength} / {MAX_CHARS}
                  </Text>
                </View>
              </View>

              {/* Voice recording player */}
              {hasVoice && (
                <View style={[styles.voicePlayer, { backgroundColor: colors.muted.DEFAULT }]}>
                  <TouchableOpacity
                    style={[styles.playButton, { backgroundColor: colors.primary.DEFAULT }]}
                    onPress={playRecording}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={20}
                      color={colors.primary.foreground}
                    />
                  </TouchableOpacity>
                  <View style={styles.playbackInfo}>
                    <Text style={[styles.playbackTime, { color: colors.foreground }]}>
                      {formatDuration(isPlaying ? playbackPosition : 0)} / {formatDuration(voiceRecording.duration)}
                    </Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.borderSolid }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { backgroundColor: colors.primary.DEFAULT },
                          { width: `${voiceRecording.duration > 0 ? (playbackPosition / voiceRecording.duration) * 100 : 0}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <TouchableOpacity onPress={clearRecording} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={20} color={colors.destructive.DEFAULT} />
                  </TouchableOpacity>
                </View>
              )}

              {/* AI 審核中指示器 (只在非模板模式顯示) */}
              {!effectiveIsUsingTemplate && isAiModerating && trimmedLength >= MIN_CHARS && (
                <View style={[styles.moderatingBox, { backgroundColor: colors.muted.DEFAULT }]}>
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                  <Text style={[styles.moderatingText, { color: colors.muted.foreground }]}>
                    AI 審核中...
                  </Text>
                </View>
              )}

              {/* AI 審核通過 (只在非模板模式顯示) */}
              {!effectiveIsUsingTemplate && !isAiModerating && aiModeration?.isAppropriate && trimmedLength >= MIN_CHARS && (
                <View style={[styles.moderatingBox, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.moderatingText, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                    AI 審核通過
                  </Text>
                </View>
              )}

              {/* AI 審核不通過 - 簡潔警告 (只在非模板模式顯示) */}
              {!effectiveIsUsingTemplate && !isAiModerating && combinedWarning.hasIssue && trimmedLength >= MIN_CHARS && (
                <View style={[styles.warningCard, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', borderColor: isDark ? '#DC2626' : '#EF4444' }]}>
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <View style={styles.warningContent}>
                    <Text style={[styles.warningText, { color: isDark ? '#FECACA' : '#991B1B' }]}>
                      {combinedWarning.message || aiModeration?.reason || '內容可能不適合發送'}
                    </Text>
                    {aiModeration?.category === 'emotional' && (
                      <Text style={[styles.warningHint, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                        建議使用 AI 優化，或修改後再發送
                      </Text>
                    )}
                    {(aiModeration?.category === 'inappropriate' || aiModeration?.category === 'dangerous') && (
                      <Text style={[styles.warningHint, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                        請修改為與行車相關的內容
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* 使用模板模式提示 */}
              {effectiveIsUsingTemplate && trimmedLength >= MIN_CHARS && (
                <View style={[styles.moderatingBox, { backgroundColor: isDark ? '#1E3A5F' : '#EAF0F8' }]}>
                  <Ionicons name="document-text" size={16} color={colors.primary.DEFAULT} />
                  <Text style={[styles.moderatingText, { color: colors.primary.DEFAULT }]}>
                    使用預設模板
                  </Text>
                </View>
              )}

              {/* AI 優化預覽 */}
              {showAiPreview && (
                <View style={[styles.aiPreviewCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.primary.DEFAULT }]}>
                  <View style={styles.aiPreviewHeader}>
                    <View style={[styles.aiPreviewBadge, { backgroundColor: `${colors.primary.DEFAULT}20` }]}>
                      <Ionicons name="sparkles" size={14} color={colors.primary.DEFAULT} />
                      <Text style={[styles.aiPreviewBadgeText, { color: colors.primary.DEFAULT }]}>AI 優化結果</Text>
                    </View>
                  </View>

                  {/* 原始內容 */}
                  <View style={styles.aiPreviewSection}>
                    <Text style={[styles.aiPreviewLabel, { color: colors.muted.foreground }]}>原始內容</Text>
                    <Text style={[styles.aiPreviewOriginal, { color: colors.muted.foreground, backgroundColor: colors.muted.DEFAULT }]}>
                      {originalTextBeforeAi}
                    </Text>
                  </View>

                  {/* 優化後內容 */}
                  <View style={styles.aiPreviewSection}>
                    <Text style={[styles.aiPreviewLabel, { color: colors.foreground }]}>優化後內容</Text>
                    <Text style={[styles.aiPreviewOptimized, { color: colors.foreground, backgroundColor: `${colors.primary.DEFAULT}10` }]}>
                      {aiOptimizedText}
                    </Text>
                  </View>

                  {/* 按鈕 */}
                  <View style={styles.aiPreviewButtons}>
                    <TouchableOpacity
                      style={[styles.aiPreviewButton, styles.aiPreviewButtonSecondary, { borderColor: colors.borderSolid }]}
                      onPress={handleCancelAiPreview}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.aiPreviewButtonText, { color: colors.foreground }]}>返回編輯</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.aiPreviewButton, styles.aiPreviewButtonPrimary, { backgroundColor: colors.primary.DEFAULT }]}
                      onPress={handleConfirmAiVersion}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.aiPreviewButtonText, { color: colors.primary.foreground }]}>使用此版本</Text>
                      <View style={styles.pointBadge}>
                        <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>2 點</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Send options - 只在非預覽模式顯示 */}
              {canProceed && !showAiPreview && (
                <View style={styles.submitOptions}>
                  {/* 模板模式：只顯示使用模板按鈕 */}
                  {effectiveIsUsingTemplate && (
                    <>
                      <TouchableOpacity
                        style={[styles.submitOption, { backgroundColor: colors.primary.DEFAULT }]}
                        onPress={handleTemplateSubmit}
                        activeOpacity={0.8}
                      >
                        <View style={styles.optionMain}>
                          <Ionicons name="document-text" size={20} color={colors.primary.foreground} />
                          <Text style={[styles.optionText, { color: colors.primary.foreground }]}>
                            使用模板
                          </Text>
                        </View>
                        <View style={styles.pointBadge}>
                          <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>
                            {selectedCategory === '讚美感謝' ? '免費' : '1 點'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <Text style={[styles.aiHint, { color: colors.muted.foreground }]}>
                        <Ionicons name="information-circle-outline" size={14} />
                        {' '}編輯訊息內容可使用更多選項
                      </Text>
                    </>
                  )}

                  {/* 非模板模式：顯示語音/AI優化/文字發送選項 */}
                  {!effectiveIsUsingTemplate && (
                    <>
                      {/* Voice option */}
                      {hasVoice && !combinedWarning.hasIssue && (
                        <TouchableOpacity
                          style={[styles.submitOption, { backgroundColor: '#10B981' }]}
                          onPress={handleVoiceSubmit}
                          activeOpacity={0.8}
                        >
                          <View style={styles.optionMain}>
                            <Ionicons name="volume-high" size={20} color="#FFFFFF" />
                            <Text style={[styles.optionText, { color: '#FFFFFF' }]}>
                              使用語音
                            </Text>
                          </View>
                          <View style={styles.pointBadge}>
                            <Text style={[styles.pointBadgeText, { color: '#FFFFFF' }]}>6 點</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {/* Text option - 審核通過時顯示（審核通過只扣 2 點）*/}
                      {aiModerationPassed && (
                        <TouchableOpacity
                          style={[styles.submitOption, { backgroundColor: colors.primary.DEFAULT }]}
                          onPress={handleTextSubmit}
                          activeOpacity={0.8}
                        >
                          <View style={styles.optionMain}>
                            <Ionicons name="document-text" size={20} color={colors.primary.foreground} />
                            <Text style={[styles.optionText, { color: colors.primary.foreground }]}>
                              使用文字
                            </Text>
                          </View>
                          <View style={styles.pointBadge}>
                            <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>2 點</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {/* emotional 類別：顯示 AI 優化（推薦）+ 堅持原內容 */}
                      {!aiModerationPassed && aiModeration?.category === 'emotional' && (
                        <>
                          {/* AI 優化（推薦） */}
                          {aiLimit.canUse && (
                            <TouchableOpacity
                              style={[
                                styles.submitOption,
                                { backgroundColor: colors.primary.DEFAULT },
                                isOptimizing && styles.buttonDisabled,
                              ]}
                              onPress={handleAiSubmit}
                              activeOpacity={0.8}
                              disabled={isOptimizing}
                            >
                              <View style={styles.optionMain}>
                                {isOptimizing ? (
                                  <ActivityIndicator size="small" color={colors.primary.foreground} />
                                ) : (
                                  <Ionicons name="sparkles" size={20} color={colors.primary.foreground} />
                                )}
                                <Text style={[styles.optionText, { color: colors.primary.foreground }]}>
                                  {isOptimizing ? 'AI 優化中...' : 'AI 優化（推薦）'}
                                </Text>
                              </View>
                              <View style={styles.pointBadge}>
                                <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>2 點</Text>
                              </View>
                            </TouchableOpacity>
                          )}

                          {/* 堅持原內容 - 語音 */}
                          {hasVoice && (
                            <TouchableOpacity
                              style={[styles.submitOption, styles.insistOption, { borderColor: colors.borderSolid }]}
                              onPress={handleVoiceSubmit}
                              activeOpacity={0.8}
                            >
                              <View style={styles.optionMain}>
                                <Ionicons name="volume-high" size={20} color={colors.muted.foreground} />
                                <Text style={[styles.optionText, { color: colors.foreground }]}>
                                  堅持使用語音
                                </Text>
                              </View>
                              <View style={[styles.pointBadge, { backgroundColor: colors.muted.DEFAULT }]}>
                                <Text style={[styles.pointBadgeText, { color: colors.foreground }]}>6 點</Text>
                              </View>
                            </TouchableOpacity>
                          )}

                          {/* 堅持原內容 - 文字 */}
                          {!hasVoice && (
                            <TouchableOpacity
                              style={[styles.submitOption, styles.insistOption, { borderColor: colors.borderSolid }]}
                              onPress={handleTextSubmit}
                              activeOpacity={0.8}
                            >
                              <View style={styles.optionMain}>
                                <Ionicons name="document-text-outline" size={20} color={colors.muted.foreground} />
                                <Text style={[styles.optionText, { color: colors.foreground }]}>
                                  堅持原內容
                                </Text>
                              </View>
                              <View style={[styles.pointBadge, { backgroundColor: colors.muted.DEFAULT }]}>
                                <Text style={[styles.pointBadgeText, { color: colors.foreground }]}>4 點</Text>
                              </View>
                            </TouchableOpacity>
                          )}

                          <Text style={[styles.insistHint, { color: colors.muted.foreground }]}>
                            堅持原內容發送可能有法律風險
                          </Text>
                        </>
                      )}
                    </>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  plateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  plateText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  categoryBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  situationSection: {
    marginBottom: spacing[5],
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    marginBottom: spacing[2],
  },
  situationScroll: {
    gap: spacing[2],
  },
  situationChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  situationChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  messageSection: {
    marginBottom: spacing[4],
  },
  inputContainer: {
    position: 'relative',
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    paddingRight: spacing[14],
    fontSize: typography.fontSize.base,
    minHeight: 120,
    lineHeight: typography.fontSize.base * 1.5,
  },
  micButton: {
    position: 'absolute',
    right: spacing[2],
    bottom: spacing[2],
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  micHint: {
    fontSize: typography.fontSize.xs,
  },
  charCount: {
    fontSize: typography.fontSize.xs,
  },
  voicePlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playbackInfo: {
    flex: 1,
    gap: spacing[1],
  },
  playbackTime: {
    fontSize: typography.fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  recordingOverlay: {
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    marginBottom: spacing[4],
    alignItems: 'center',
    gap: spacing[4],
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  recordingIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  recordingTime: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold as any,
    fontVariant: ['tabular-nums'],
  },
  recordingHint: {
    fontSize: typography.fontSize.base,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[2],
  },
  recordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
  },
  recordingButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  stopIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  transcribingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  transcribingText: {
    fontSize: typography.fontSize.base,
  },
  moderatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  moderatingText: {
    fontSize: typography.fontSize.sm,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    gap: spacing[2.5],
  },
  warningContent: {
    flex: 1,
    gap: spacing[2],
  },
  warningTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  legalWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[2.5],
    borderRadius: borderRadius.md,
    marginTop: spacing[1],
  },
  warningHint: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing[1],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitOptions: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
  submitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  directOption: {
    borderWidth: 1,
  },
  optionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  optionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  pointBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  pointBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
  },
  aiHint: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  insistOption: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  insistHint: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    marginTop: spacing[1],
  },

  // AI 優化預覽
  aiPreviewCard: {
    borderWidth: 2,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  aiPreviewHeader: {
    marginBottom: spacing[3],
  },
  aiPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
  },
  aiPreviewBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },
  aiPreviewSection: {
    marginBottom: spacing[3],
  },
  aiPreviewLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
    marginBottom: spacing[1.5],
  },
  aiPreviewOriginal: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    textDecorationLine: 'line-through',
  },
  aiPreviewOptimized: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.5,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    fontWeight: typography.fontWeight.medium as any,
  },
  aiPreviewButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  aiPreviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.xl,
  },
  aiPreviewButtonSecondary: {
    borderWidth: 1,
  },
  aiPreviewButtonPrimary: {},
  aiPreviewButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },

});
