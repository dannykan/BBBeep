/**
 * Custom Screen
 * 自訂補充說明（文字輸入 + 語音錄音整合）
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, StepHeader } from './components';
import { aiApi, uploadApi } from '@bbbeeep/shared';
import { typography, spacing, borderRadius } from '../../theme';

const MAX_DURATION = 15; // Maximum recording duration in seconds
const MIN_CHARS = 5;
const MAX_CHARS = 30;

type Props = NativeStackScreenProps<SendStackParamList, 'Custom'>;

export default function CustomScreen({ navigation }: Props) {
  const {
    vehicleType,
    selectedCategory,
    selectedSituation,
    generatedMessage,
    customText,
    setCustomText,
    setAiSuggestion,
    setUsedAi,
    setUseAiVersion,
    aiLimit,
    checkAiLimit,
    isLoading,
    setIsLoading,
    contentWarning,
    checkAiModeration,
    aiModeration,
    isAiModerating,
    voiceRecording,
    setVoiceRecording,
    setSendMode,
    clearVoice,
    validateContent,
  } = useSend();
  const { colors, isDark } = useTheme();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Save previous state for cancel restoration
  const previousStateRef = useRef<{
    voiceRecording: typeof voiceRecording;
    customText: string;
  } | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Check permissions on mount and cleanup
  useEffect(() => {
    checkPermissions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Cleanup sound on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      // Cleanup recording on unmount
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  // Debounced AI content moderation
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    // Use longer debounce for AI moderation (to avoid excessive API calls)
    debounceRef.current = setTimeout(() => {
      checkAiModeration(customText);
    }, 800);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [customText, checkAiModeration]);

  const checkPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
    }
  };

  // Pulse animation for recording indicator
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
    if (!hasPermission) {
      Alert.alert('權限不足', '需要麥克風權限才能錄音');
      return;
    }

    // Save current state before anything (for cancel restoration)
    previousStateRef.current = {
      voiceRecording: voiceRecording,
      customText: customText,
    };

    try {
      // Stop any existing playback
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
      setPlaybackPosition(0);

      // Clean up any existing recording object first (technical requirement)
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          // Ignore errors from already stopped recordings
        }
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

      // Only clear UI state after recording successfully started
      clearVoice();
      setCustomText('');

      setIsRecording(true);
      setRecordingDuration(0);
      startPulseAnimation();

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Restore previous state on error
      if (previousStateRef.current) {
        if (previousStateRef.current.voiceRecording) {
          setVoiceRecording(previousStateRef.current.voiceRecording);
        }
        setCustomText(previousStateRef.current.customText);
        previousStateRef.current = null;
      }
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
        // Save voice recording
        setVoiceRecording({
          uri,
          duration: recordingDuration,
          transcript: '',
        });

        // Auto-transcribe (this will replace any previous text with the new transcription)
        await transcribeVoice(uri);

        // Clear previous state reference - the new recording is now the current state
        previousStateRef.current = null;
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

      // Restore previous state if it exists
      if (previousStateRef.current) {
        if (previousStateRef.current.voiceRecording) {
          setVoiceRecording(previousStateRef.current.voiceRecording);
        }
        setCustomText(previousStateRef.current.customText);
        previousStateRef.current = null;
      }
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      setIsRecording(false);
      recordingRef.current = null;
      // Still try to restore previous state on error
      if (previousStateRef.current) {
        if (previousStateRef.current.voiceRecording) {
          setVoiceRecording(previousStateRef.current.voiceRecording);
        }
        setCustomText(previousStateRef.current.customText);
        previousStateRef.current = null;
      }
    }
  };

  const transcribeVoice = async (uri: string) => {
    setIsTranscribing(true);
    try {
      const result = await uploadApi.transcribeVoice(uri);
      if (result.text) {
        // Set the transcribed text to the input
        setCustomText(result.text);
        // Update voice recording with transcript
        if (voiceRecording) {
          setVoiceRecording({
            ...voiceRecording,
            transcript: result.text,
          });
        }
      }
    } catch (error: any) {
      console.error('Transcription failed:', error);
      Alert.alert('轉文字失敗', '語音轉文字失敗，請手動輸入或重新錄音');
    } finally {
      setIsTranscribing(false);
    }
  };

  const clearRecording = async () => {
    // Stop playback if playing
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackPosition(0);
    clearVoice();
    setCustomText('');
  };

  // Playback functions
  const playRecording = async () => {
    if (!voiceRecording?.uri) return;

    try {
      // If already playing, pause
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      // If sound exists but paused, resume
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }

      // Create new sound
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
        // Unload the sound when finished
        if (soundRef.current) {
          soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      }
    }
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackPosition(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isOtherCase =
    selectedCategory === '其他情況' ||
    (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise');

  const trimmedLength = customText.trim().length;
  const isValidLength = trimmedLength >= MIN_CHARS && trimmedLength <= MAX_CHARS;
  const canSubmit = isOtherCase ? isValidLength : true;
  const hasVoice = voiceRecording !== null;

  // Submit handlers
  const handleVoiceSubmit = () => {
    if (!voiceRecording) return;
    setSendMode('voice');
    setUseAiVersion(false);
    setUsedAi(false);
    navigation.navigate('Confirm');
  };

  const handleDirectSubmit = () => {
    if (isOtherCase && !isValidLength) {
      Alert.alert('錯誤', `說明內容需要 ${MIN_CHARS}-${MAX_CHARS} 個字`);
      return;
    }
    if (!isOtherCase && customText.trim() && !isValidLength) {
      Alert.alert('錯誤', `補充文字需要 ${MIN_CHARS}-${MAX_CHARS} 個字`);
      return;
    }
    // 2026-01 更新：不再阻擋發送，只在 UI 顯示警告
    // 用戶可以選擇繼續發送或使用 AI 優化
    setSendMode('text');
    setUseAiVersion(false);
    setUsedAi(false);
    navigation.navigate('Confirm');
  };

  const handleAiSubmit = async () => {
    if (!isValidLength) {
      Alert.alert('錯誤', `${isOtherCase ? '說明內容' : '補充文字'}需要 ${MIN_CHARS}-${MAX_CHARS} 個字`);
      return;
    }
    // Note: We allow AI optimization even with inappropriate content
    // AI will help rewrite the content to be more appropriate

    setIsLoading(true);
    try {
      const textToRewrite = isOtherCase
        ? customText
        : `${generatedMessage} ${customText}`;
      const result = await aiApi.rewrite(
        textToRewrite,
        vehicleType || undefined,
        selectedCategory || undefined
      );
      setAiSuggestion(result.rewritten);
      setUsedAi(true);
      setSendMode('ai');
      await checkAiLimit();
      navigation.navigate('AiSuggest');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || 'AI 改寫失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // Warning colors for dark mode
  const warningBgColor = isDark ? '#78350F' : '#FEF3C7';
  const warningBorderColor = isDark ? '#D97706' : '#F59E0B';
  const warningTextColor = isDark ? '#FCD34D' : '#B45309';
  const warningHintColor = isDark ? '#FBBF24' : '#D97706';

  return (
    <SendLayout currentStep={4} totalSteps={5}>
      <StepHeader
        title={isOtherCase ? '請說明情況' : '補充說明'}
        subtitle={
          isOtherCase
            ? '請詳細描述你想提醒的事項'
            : '補充更多資訊，讓提醒更清楚'
        }
      />

      {!isOtherCase && generatedMessage && (
        <View style={[styles.generatedCard, { backgroundColor: colors.muted.DEFAULT }]}>
          <Text style={[styles.generatedLabel, { color: colors.muted.foreground }]}>系統生成</Text>
          <Text style={[styles.generatedText, { color: colors.foreground }]}>{generatedMessage}</Text>
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
              {formatDuration(recordingDuration)} / {formatDuration(MAX_DURATION)}
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
            正在轉換文字...
          </Text>
        </View>
      )}

      {/* Input section (hidden during recording) */}
      {!isRecording && !isTranscribing && (
        <>
          <View style={styles.inputSection}>
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                {isOtherCase ? '說明內容' : '補充說明'}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.card.DEFAULT, borderColor: colors.border, color: colors.foreground },
                ]}
                value={customText}
                onChangeText={setCustomText}
                placeholder={
                  isOtherCase
                    ? `請描述你想提醒的情況（${MIN_CHARS}-${MAX_CHARS} 字）`
                    : `例如：車牌貼紙快掉了（${MIN_CHARS}-${MAX_CHARS} 字）`
                }
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

            <View style={styles.inputFooter}>
              <Text style={[styles.micHint, { color: colors.muted.foreground }]}>
                <Ionicons name="mic-outline" size={12} color={colors.muted.foreground} /> 點擊錄音，自動轉文字
              </Text>
              <Text
                style={[
                  styles.charCount,
                  { color: colors.muted.foreground },
                  trimmedLength > 0 && !isValidLength && { color: colors.destructive.DEFAULT },
                ]}
              >
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

          {/* AI 審核中指示器 */}
          {isAiModerating && trimmedLength >= MIN_CHARS && (
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: colors.muted.DEFAULT }]}>
                <ActivityIndicator size={12} color={colors.primary.DEFAULT} />
                <Text style={[styles.statusBadgeText, { color: colors.muted.foreground }]}>
                  AI 審核中...
                </Text>
              </View>
            </View>
          )}

          {/* AI 審核通過指示器 */}
          {!isAiModerating && aiModeration?.category === 'ok' && trimmedLength >= MIN_CHARS && (
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={[styles.statusBadgeText, { color: isDark ? '#6EE7B7' : '#047857' }]}>
                  AI 審核通過
                </Text>
              </View>
            </View>
          )}

          {/* AI 審核結果 - 情緒性內容（可接受但建議優化） */}
          {!isAiModerating && aiModeration?.category === 'emotional' && trimmedLength >= MIN_CHARS && (
            <View style={[styles.emotionalWarning, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', borderColor: isDark ? '#3B82F6' : '#93C5FD' }]}>
              <View style={styles.emotionalHeader}>
                <Ionicons name="alert-circle" size={20} color={isDark ? '#60A5FA' : '#3B82F6'} />
                <Text style={[styles.emotionalTitle, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                  偵測到情緒性用語
                </Text>
              </View>
              <Text style={[styles.emotionalBody, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                建議使用 AI 優化後發送，讓訊息更友善專業
              </Text>
              <View style={[styles.legalWarning, { backgroundColor: isDark ? '#451A03' : '#FEF9C3', borderColor: isDark ? '#CA8A04' : '#FDE047' }]}>
                <Ionicons name="warning" size={14} color={isDark ? '#FACC15' : '#CA8A04'} style={{ marginRight: 6 }} />
                <Text style={[styles.legalText, { color: isDark ? '#FDE047' : '#854D0E' }]}>
                  對陌生人使用不當言語可能有法律風險，請三思
                </Text>
              </View>
            </View>
          )}

          {/* AI 審核結果 - 不適當/危險內容 */}
          {!isAiModerating && contentWarning && aiModeration?.category !== 'emotional' && trimmedLength >= MIN_CHARS && (
            <View style={[styles.warningCard, { backgroundColor: warningBgColor, borderColor: warningBorderColor }]}>
              <Ionicons name="warning" size={16} color="#D97706" />
              <View style={styles.warningContent}>
                <Text style={[styles.warningText, { color: warningTextColor }]}>{contentWarning}</Text>
                <Text style={[styles.warningHint, { color: warningHintColor }]}>
                  {aiModeration?.category === 'dangerous' ? '此內容無法發送' : '送出時將無法通過驗證'}
                </Text>
              </View>
            </View>
          )}

          {/* Send options */}
          {(customText.trim().length > 0 || hasVoice) && !isAiModerating && (
            <View style={styles.submitOptions}>
              {/* Voice send option - allowed for ok and emotional categories */}
              {hasVoice && (!aiModeration || aiModeration.category === 'ok' || aiModeration.category === 'emotional') && (
                <TouchableOpacity
                  style={[styles.submitOption, { backgroundColor: '#10B981' }]}
                  onPress={handleVoiceSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionMain}>
                    <Ionicons name="volume-high" size={20} color="#FFFFFF" />
                    <Text style={[styles.optionText, { color: '#FFFFFF' }]}>使用語音</Text>
                  </View>
                  <View style={styles.pointBadge}>
                    <Text style={[styles.pointBadgeText, { color: '#FFFFFF' }]}>8 點</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Content blocked hint - only for inappropriate/dangerous content */}
              {aiModeration && (aiModeration.category === 'inappropriate' || aiModeration.category === 'dangerous') && (
                <View style={[styles.blockedHint, { backgroundColor: colors.muted.DEFAULT }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.muted.foreground} />
                  <Text style={[styles.blockedHintText, { color: colors.muted.foreground }]}>
                    {aiModeration.category === 'dangerous'
                      ? '此內容包含危險言論，無法發送'
                      : `內容審核未通過，無法使用${hasVoice ? '語音或' : ''}文字送出，請使用 AI 優化或是重新輸入`}
                  </Text>
                </View>
              )}

              {/* AI optimization option - available when text is 5+ chars (even if over limit), not for dangerous */}
              {aiLimit.canUse && trimmedLength >= MIN_CHARS && aiModeration?.category !== 'dangerous' && (
                <TouchableOpacity
                  style={[
                    styles.submitOption,
                    { backgroundColor: colors.primary.DEFAULT },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleAiSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.primary.foreground} />
                  ) : (
                    <>
                      <View style={styles.optionMain}>
                        <Ionicons name="sparkles" size={20} color={colors.primary.foreground} />
                        <Text style={[styles.optionText, { color: colors.primary.foreground }]}>
                          {aiModeration?.category === 'emotional' ? 'AI 優化（推薦）' : 'AI 優化'}
                        </Text>
                      </View>
                      <View style={styles.pointBadge}>
                        <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>2 點</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Direct text send option - allowed for ok and emotional categories */}
              {isValidLength && (!aiModeration || aiModeration.category === 'ok' || aiModeration.category === 'emotional') && (
                <TouchableOpacity
                  style={[
                    styles.submitOption,
                    styles.directOption,
                    { backgroundColor: colors.card.DEFAULT, borderColor: colors.border },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleDirectSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionMain}>
                    <Text style={[styles.optionText, { color: colors.foreground }]}>使用文字</Text>
                  </View>
                  <View style={[styles.pointBadge, { backgroundColor: colors.muted.DEFAULT }]}>
                    <Text style={[styles.pointBadgeText, { color: colors.muted.foreground }]}>4 點</Text>
                  </View>
                </TouchableOpacity>
              )}

              {aiLimit.canUse && (
                <Text style={[styles.aiHint, { color: colors.muted.foreground }]}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.muted.foreground} />
                  {' '}AI 會幫你優化文字，讓提醒更專業友善
                </Text>
              )}
            </View>
          )}

          {/* Skip button (only for non-required cases with no input) */}
          {!isOtherCase && customText.trim().length === 0 && !hasVoice && (
            <TouchableOpacity
              style={[styles.skipButton, { backgroundColor: colors.muted.DEFAULT }]}
              onPress={handleDirectSubmit}
              activeOpacity={0.8}
            >
              <Text style={[styles.skipButtonText, { color: colors.muted.foreground }]}>跳過，直接送出</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  generatedCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  generatedLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[1],
  },
  generatedText: {
    fontSize: typography.fontSize.sm,
  },
  inputSection: {
    marginBottom: spacing[4],
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  clearText: {
    fontSize: typography.fontSize.sm,
  },
  inputContainer: {
    position: 'relative',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    paddingRight: spacing[14],
    fontSize: typography.fontSize.base,
    minHeight: 120,
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
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
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
  emotionalWarning: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  emotionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  emotionalTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },
  emotionalBody: {
    fontSize: typography.fontSize.sm,
  },
  legalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
    padding: spacing[2.5],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  legalText: {
    fontSize: typography.fontSize.xs,
    lineHeight: 16,
    textAlign: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  warningContent: {
    flex: 1,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  warningHint: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing[0.5],
  },
  submitOptions: {
    gap: spacing[3],
  },
  blockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  blockedHintText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
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
  skipButton: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
