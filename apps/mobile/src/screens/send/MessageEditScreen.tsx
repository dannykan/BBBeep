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
  Modal,
} from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, CompactStepHeader } from './components';
import { displayLicensePlate, uploadApi, activitiesApi, draftsApi, VoiceDraft } from '@bbbeeep/shared';
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

  // Draft picker state
  const [showDraftPicker, setShowDraftPicker] = useState(false);
  const [drafts, setDrafts] = useState<VoiceDraft[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

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

      // 優化的語音錄音設定（檔案大小約為 HIGH_QUALITY 的 1/4）
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 64000,
        },
      });
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

      // 檢查是否有錯誤訊息（AI 無法辨識）
      if (result.error) {
        Alert.alert('語音辨識失敗', result.error);
        // 保留錄音但不設定文字，讓用戶可以手動輸入
        setVoiceRecording({
          ...recording,
          transcript: '',
        });
        return;
      }

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

  // 載入語音草稿
  const loadDrafts = useCallback(async () => {
    setIsLoadingDrafts(true);
    try {
      const response = await draftsApi.getAll();
      // 只顯示 READY 狀態的草稿
      const readyDrafts = response.drafts.filter(d => d.status === 'READY');
      setDrafts(readyDrafts);
    } catch (error) {
      console.error('Failed to load drafts:', error);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, []);

  // 打開草稿選擇器
  const openDraftPicker = useCallback(async () => {
    setShowDraftPicker(true);
    await loadDrafts();
  }, [loadDrafts]);

  // 選擇草稿中的語音
  const selectDraft = useCallback((draft: VoiceDraft) => {
    // 設定語音錄音
    setVoiceRecording({
      uri: draft.voiceUrl,
      duration: draft.voiceDuration,
      transcript: draft.transcript,
    });

    // 如果草稿有轉錄文字，設定為訊息
    if (draft.transcript) {
      setMessage(draft.transcript);
      setCustomText(draft.transcript);
      setIsUsingTemplate(false);
      voiceTranscriptRef.current = draft.transcript;
      // 審核語音轉文字內容
      checkVoiceModeration(draft.transcript);
    }

    setShowDraftPicker(false);
  }, [setVoiceRecording, setCustomText, checkVoiceModeration]);

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
    // 2026-01 更新：不再阻擋發送，只在 UI 顯示警告
    // 用戶可以選擇繼續發送或使用 AI 優化
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

  // Get category display info (matching CategoryScreenV2 design)
  const getCategoryInfo = () => {
    switch (selectedCategory) {
      case '車況提醒':
        return { icon: 'alert-circle-outline', iconColor: '#F59E0B', iconBgColor: '#FEF3C7' };
      case '行車安全':
        return { icon: 'shield-checkmark-outline', iconColor: colors.primary.DEFAULT, iconBgColor: '#DBEAFE' };
      case '讚美感謝':
        return { icon: 'heart', iconColor: '#22C55E', iconBgColor: '#DCFCE7' };
      default:
        return { icon: 'chatbubble-outline', iconColor: '#A855F7', iconBgColor: '#F3E8FF' };
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
            <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.iconBgColor }]}>
              <Ionicons name={categoryInfo.icon as any} size={14} color={categoryInfo.iconColor} />
              <Text style={[styles.categoryBadgeText, { color: categoryInfo.iconColor }]}>
                {selectedCategory === '其他情況' ? '其他' : selectedCategory}
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
                            : colors.border,
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
                        borderColor: colors.border,
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
                    <Ionicons name="mic" size={18} color={colors.primary.foreground} />
                    <Text style={styles.micButtonText}>語音訊息</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.messageFooter}>
                  <TouchableOpacity
                    style={[styles.draftChip, { backgroundColor: colors.muted.DEFAULT }]}
                    onPress={openDraftPicker}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="mic-outline" size={14} color={colors.primary.DEFAULT} />
                    <Text style={[styles.draftChipText, { color: colors.primary.DEFAULT }]}>
                      從語音草稿選擇
                    </Text>
                  </TouchableOpacity>
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
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
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
                <View style={styles.statusBadgeContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: colors.muted.DEFAULT }]}>
                    <ActivityIndicator size={12} color={colors.primary.DEFAULT} />
                    <Text style={[styles.statusBadgeText, { color: colors.muted.foreground }]}>
                      AI 審核中...
                    </Text>
                  </View>
                </View>
              )}

              {/* AI 審核通過 (只在非模板模式顯示) */}
              {!effectiveIsUsingTemplate && !isAiModerating && aiModeration?.isAppropriate && trimmedLength >= MIN_CHARS && (
                <View style={styles.statusBadgeContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={[styles.statusBadgeText, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                      AI 審核通過
                    </Text>
                  </View>
                </View>
              )}

              {/* AI 審核警告 - 統一警告訊息 (只在非模板模式顯示) */}
              {/* 檢查 combinedWarning (voice/text moderation) 或 aiModeration 任一有問題就顯示警告 */}
              {!effectiveIsUsingTemplate && !isAiModerating && (combinedWarning.hasIssue || (aiModeration && !aiModeration.isAppropriate)) && trimmedLength >= MIN_CHARS && (
                <View style={[styles.warningCard, { backgroundColor: isDark ? '#7F1D1D' : '#FEF3C7', borderColor: isDark ? '#DC2626' : '#F59E0B' }]}>
                  <Ionicons name="warning" size={20} color={isDark ? '#DC2626' : '#F59E0B'} />
                  <View style={styles.warningContent}>
                    <Text style={[styles.warningText, { color: isDark ? '#FECACA' : '#92400E' }]}>
                      內容可能有法律風險，送出前請三思
                    </Text>
                    <Text style={[styles.warningHint, { color: isDark ? '#FCA5A5' : '#B45309' }]}>
                      建議使用 AI 優化讓訊息更友善
                    </Text>
                  </View>
                </View>
              )}

              {/* 使用模板模式提示 */}
              {effectiveIsUsingTemplate && trimmedLength >= MIN_CHARS && (
                <View style={styles.statusBadgeContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: isDark ? '#1E3A5F' : '#EAF0F8' }]}>
                    <Ionicons name="document-text" size={14} color={colors.primary.DEFAULT} />
                    <Text style={[styles.statusBadgeText, { color: colors.primary.DEFAULT }]}>
                      使用預設模板
                    </Text>
                  </View>
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
                      style={[styles.aiPreviewButton, styles.aiPreviewButtonSecondary, { borderColor: colors.border }]}
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
                      <Text style={[styles.aiPreviewButtonText, { color: colors.primary.foreground }]}>使用此版本送出</Text>
                      <View style={styles.pointBadge}>
                        <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>免費</Text>
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
                            使用模板送出
                          </Text>
                        </View>
                        <View style={styles.pointBadge}>
                          <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>
                            免費
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <Text style={[styles.aiHint, { color: colors.muted.foreground }]}>
                        <Ionicons name="information-circle-outline" size={14} />
                        {' '}編輯訊息內容可使用更多選項
                      </Text>
                    </>
                  )}

                  {/* 非模板模式：簡化邏輯 - 永遠顯示發送按鈕，有警告時額外顯示提示 */}
                  {!effectiveIsUsingTemplate && (
                    <>
                      {/* Voice option - 有語音時顯示 */}
                      {hasVoice && (
                        <TouchableOpacity
                          style={[styles.submitOption, { backgroundColor: '#10B981' }]}
                          onPress={handleVoiceSubmit}
                          activeOpacity={0.8}
                        >
                          <View style={styles.optionMain}>
                            <Ionicons name="volume-high" size={20} color="#FFFFFF" />
                            <Text style={[styles.optionText, { color: '#FFFFFF' }]}>
                              使用語音送出
                            </Text>
                          </View>
                          <View style={styles.pointBadge}>
                            <Text style={[styles.pointBadgeText, { color: '#FFFFFF' }]}>8 點</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {/* Text option - 永遠顯示（無語音時）*/}
                      {!hasVoice && (
                        <TouchableOpacity
                          style={[styles.submitOption, { backgroundColor: colors.primary.DEFAULT }]}
                          onPress={handleTextSubmit}
                          activeOpacity={0.8}
                        >
                          <View style={styles.optionMain}>
                            <Ionicons name="document-text" size={20} color={colors.primary.foreground} />
                            <Text style={[styles.optionText, { color: colors.primary.foreground }]}>
                              使用文字送出
                            </Text>
                          </View>
                          <View style={styles.pointBadge}>
                            <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>免費</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {/* AI 優化選項 - 有警告且 AI 可用時顯示 */}
                      {!aiModerationPassed && aiLimit.canUse && (
                        <TouchableOpacity
                          style={[
                            styles.submitOption,
                            styles.insistOption,
                            { borderColor: colors.primary.DEFAULT },
                            isOptimizing && styles.buttonDisabled,
                          ]}
                          onPress={handleAiSubmit}
                          activeOpacity={0.8}
                          disabled={isOptimizing}
                        >
                          <View style={styles.optionMain}>
                            {isOptimizing ? (
                              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                            ) : (
                              <Ionicons name="sparkles" size={20} color={colors.primary.DEFAULT} />
                            )}
                            <Text style={[styles.optionText, { color: colors.primary.DEFAULT }]}>
                              {isOptimizing ? 'AI 優化中...' : 'AI 優化（推薦）'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Draft Picker Modal */}
      <Modal
        visible={showDraftPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDraftPicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDraftPicker(false)}
            >
              <Ionicons name="chevron-down" size={24} color={colors.muted.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>語音草稿</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          {isLoadingDrafts ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
            </View>
          ) : drafts.length === 0 ? (
            <View style={styles.modalEmpty}>
              <View style={[styles.modalEmptyIcon, { backgroundColor: colors.muted.DEFAULT }]}>
                <Ionicons name="mic-outline" size={40} color={colors.muted.foreground} />
              </View>
              <Text style={[styles.modalEmptyText, { color: colors.foreground }]}>
                沒有語音草稿
              </Text>
              <Text style={[styles.modalEmptyHint, { color: colors.muted.foreground }]}>
                使用首頁「一鍵語音」錄製並儲存草稿
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {drafts.map((draft, index) => (
                <TouchableOpacity
                  key={draft.id}
                  style={[
                    styles.draftItem,
                    { backgroundColor: colors.card.DEFAULT },
                    index === 0 && styles.draftItemFirst,
                    index === drafts.length - 1 && styles.draftItemLast,
                  ]}
                  onPress={() => selectDraft(draft)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.draftIconSmall, { backgroundColor: colors.primary.soft }]}>
                    <Ionicons name="mic" size={16} color={colors.primary.DEFAULT} />
                  </View>
                  <View style={styles.draftInfo}>
                    <View style={styles.draftInfoTop}>
                      <Text style={[styles.draftDuration, { color: colors.foreground }]}>
                        {formatDuration(draft.voiceDuration)}
                      </Text>
                      <Text style={[styles.draftDate, { color: colors.muted.foreground }]}>
                        {new Date(draft.createdAt).toLocaleDateString('zh-TW', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    {draft.transcript && (
                      <Text style={[styles.draftTranscript, { color: colors.muted.foreground }]} numberOfLines={1}>
                        {draft.transcript}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.draftSelectButton, { backgroundColor: colors.primary.soft }]}>
                    <Text style={[styles.draftSelectText, { color: colors.primary.DEFAULT }]}>選擇</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
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
    gap: 8,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
  },
  plateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: '500',
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
    paddingRight: 120,
    fontSize: typography.fontSize.base,
    minHeight: 120,
    lineHeight: typography.fontSize.base * 1.5,
  },
  micButton: {
    position: 'absolute',
    right: spacing[2],
    bottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: spacing[3],
    borderRadius: 18,
  },
  micButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  draftChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
  },
  draftChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
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
  statusBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing[4],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
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


  // Draft picker modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  modalEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  modalEmptyText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  modalEmptyHint: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.5,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: spacing[4],
  },
  draftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  draftItemFirst: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  draftItemLast: {
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    borderBottomWidth: 0,
  },
  draftIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftInfo: {
    flex: 1,
    gap: spacing[0.5],
  },
  draftInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftDuration: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },
  draftTranscript: {
    fontSize: typography.fontSize.xs,
  },
  draftDate: {
    fontSize: typography.fontSize.xs,
  },
  draftSelectButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
  },
  draftSelectText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
  },

});
