/**
 * QuickRecordModal - 快速錄音 Modal（優化版）
 *
 * 流程：錄音 → AI 解析 → 智能確認（可編輯）→ 發送/存草稿
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Alert,
  Vibration,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  AppState,
} from 'react-native';
// BlurView 在某些環境有相容性問題，使用半透明背景替代
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { uploadApi, messagesApi, draftsApi, aiApi } from '@bbbeeep/shared';
import type { AiModerationResponse } from '@bbbeeep/shared';

// 定義解析結果的類型
interface ParsedPlate {
  plate: string;
  confidence: number;
}

interface ParsedVehicle {
  type: 'car' | 'scooter' | 'unknown';
  color?: string;
  brand?: string;
  model?: string;
}

interface ParsedEvent {
  category: string;
  type?: string;
  description?: string;
  location?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface QuickRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onNavigateToVoiceSend?: (params: {
    voiceUri: string;
    voiceDuration: number;
    transcript: string;
    recordedAt: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  }) => void;
}

type Step = 'recording' | 'analyzing' | 'choice' | 'confirm' | 'success';
type VehicleType = 'car' | 'scooter';
type Category = '車況提醒' | '行車安全提醒' | '讚美感謝';
type TimeOption = 'now' | '5min' | '10min' | '15min';

interface ParsedData {
  plates: ParsedPlate[];
  vehicle?: ParsedVehicle;
  event?: ParsedEvent;
  suggestedMessage?: string;
}

const MAX_RECORDING_DURATION = 30;

const CATEGORY_OPTIONS: { value: Category; label: string; icon: string }[] = [
  { value: '車況提醒', label: '車況提醒', icon: 'car-outline' },
  { value: '行車安全提醒', label: '行車安全', icon: 'warning-outline' },
  { value: '讚美感謝', label: '讚美感謝', icon: 'heart-outline' },
];

const TIME_OPTIONS: { value: TimeOption; label: string }[] = [
  { value: 'now', label: '現在' },
  { value: '5min', label: '5分鐘前' },
  { value: '10min', label: '10分鐘前' },
  { value: '15min', label: '15分鐘前' },
];

export function QuickRecordModal({
  visible,
  onClose,
  onSuccess,
  onNavigateToVoiceSend,
}: QuickRecordModalProps) {
  const { colors } = useTheme();

  // 記錄錄製完成時間
  const [recordedAt, setRecordedAt] = useState<string>(new Date().toISOString());

  // 步驟狀態
  const [step, setStep] = useState<Step>('recording');

  // 錄音狀態
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 音量動畫
  const volumeAnim = useRef(new Animated.Value(1)).current;
  const [currentVolume, setCurrentVolume] = useState(0);

  // AI 解析結果
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [transcript, setTranscript] = useState('');

  // 用戶可編輯的欄位
  const [selectedPlate, setSelectedPlate] = useState('');
  const [customPlate, setCustomPlate] = useState('');
  const [showCustomPlate, setShowCustomPlate] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [category, setCategory] = useState<Category>('行車安全提醒');
  const [message, setMessage] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [showAdditionalNote, setShowAdditionalNote] = useState(false);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [timeOption, setTimeOption] = useState<TimeOption>('now');

  // Loading 狀態
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAutoSaved, setIsAutoSaved] = useState(false);

  // AI 審核狀態
  const [aiModeration, setAiModeration] = useState<AiModerationResponse | null>(null);
  const [isAiModerating, setIsAiModerating] = useState(false);
  const moderationDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 語音播放
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 重置狀態
  const resetState = useCallback(() => {
    setStep('recording');
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setVoiceUri(null);
    setVoiceDuration(0);
    setCurrentVolume(0);
    volumeAnim.setValue(1);
    setParsedData(null);
    setTranscript('');
    setSelectedPlate('');
    setCustomPlate('');
    setShowCustomPlate(false);
    setVehicleType('car');
    setCategory('行車安全提醒');
    setMessage('');
    setAdditionalNote('');
    setShowAdditionalNote(false);
    setLocation('');
    setLatitude(null);
    setLongitude(null);
    setTimeOption('now');
    setIsSaving(false);
    setIsSending(false);
    setIsAutoSaved(false);
    setAiModeration(null);
    setIsAiModerating(false);
    if (moderationDebounceRef.current) {
      clearTimeout(moderationDebounceRef.current);
    }
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
  }, [sound, volumeAnim]);

  // 關閉時重置
  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [visible, resetState]);

  // 清理
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (sound) {
        sound.unloadAsync();
      }
      if (moderationDebounceRef.current) {
        clearTimeout(moderationDebounceRef.current);
      }
    };
  }, [sound]);

  // AI 審核（訊息變更時觸發）
  useEffect(() => {
    if (moderationDebounceRef.current) {
      clearTimeout(moderationDebounceRef.current);
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 5) {
      setAiModeration(null);
      setIsAiModerating(false);
      return;
    }

    moderationDebounceRef.current = setTimeout(async () => {
      setIsAiModerating(true);
      try {
        const result = await aiApi.moderate(trimmedMessage);
        console.log('[AI Moderation] Result:', result);
        setAiModeration(result);
      } catch (error) {
        console.error('[AI Moderation] Error:', error);
        // 錯誤時預設允許發送
        setAiModeration({ isAppropriate: true, reason: null, category: 'ok', suggestion: null });
      } finally {
        setIsAiModerating(false);
      }
    }, 800);

    return () => {
      if (moderationDebounceRef.current) {
        clearTimeout(moderationDebounceRef.current);
      }
    };
  }, [message]);

  // 脈動動畫
  useEffect(() => {
    if (isRecording) {
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
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // 開啟時自動開始錄音
  useEffect(() => {
    if (visible && step === 'recording' && !isRecording && !voiceUri) {
      startRecording();
    }
  }, [visible, step]);

  // 開始錄音（權限已在打開 Modal 前確認）
  const startRecording = async () => {
    try {
      // Check if app is in foreground before starting recording
      if (AppState.currentState !== 'active') {
        console.log('[Recording] App not in foreground, skipping...');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      Vibration.vibrate(50);

      // 使用支援 metering 的錄音設定
      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions,
        // 音量狀態更新回調
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            // metering 值通常在 -160 到 0 之間，轉換為 0-1 的範圍
            // -60 以下視為靜音，0 為最大音量
            const normalizedVolume = Math.max(0, Math.min(1, (status.metering + 60) / 60));
            setCurrentVolume(normalizedVolume);

            // 動畫：根據音量調整縮放 (1.0 到 1.4)
            Animated.timing(volumeAnim, {
              toValue: 1 + normalizedVolume * 0.4,
              duration: 100,
              useNativeDriver: true,
            }).start();
          }
        },
        100 // 每 100ms 更新一次
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // 同時取得位置
      getLocation();

      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= MAX_RECORDING_DURATION - 1) {
            stopRecording();
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      // Silently ignore background errors
      if (err.message?.includes('background') || AppState.currentState !== 'active') {
        console.log('[Recording] Background error, ignoring:', err.message);
        return;
      }
      Alert.alert('錯誤', err.message || '無法開始錄音');
      onClose();
    }
  };

  // 取得位置（靜默取得，不強制要求）
  const getLocation = async () => {
    try {
      const { status: existingStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();

      let hasPermission = existingStatus === 'granted';

      if (!hasPermission && canAskAgain) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        hasPermission = status === 'granted';
      }

      if (hasPermission) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);

        const [addr] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (addr) {
          const address = [addr.city, addr.district, addr.street]
            .filter(Boolean)
            .join('');
          setLocation(address);
        }
      }
      // 如果沒有權限就靜默忽略，不打擾用戶錄音流程
    } catch (err) {
      console.warn('Could not get location:', err);
    }
  };

  // 停止錄音並開始分析
  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // 先取得狀態和 URI（在 unload 之前）
      const status = await recording.getStatusAsync();
      const uri = recording.getURI();
      const duration = Math.ceil((status.durationMillis || 0) / 1000);

      // 使用已追蹤的 recordingDuration 作為備用
      const finalDuration = duration > 0 ? duration : recordingDuration;

      Vibration.vibrate(50);
      await recording.stopAndUnloadAsync();

      setRecording(null);
      setIsRecording(false);
      setVoiceUri(uri);
      setVoiceDuration(finalDuration);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      console.log('[Recording] URI:', uri, 'Duration:', finalDuration);

      if (uri && finalDuration >= 1) {
        // 進入分析階段
        setStep('analyzing');
        await analyzeVoice(uri);
      } else {
        Alert.alert('錄音太短', '請至少錄製 1 秒');
        resetState();
      }
    } catch (err: any) {
      console.error('[Recording] Stop error:', err);
      Alert.alert('錯誤', err.message || '錄音失敗');
      resetState();
    }
  };

  // 取消錄音
  const cancelRecording = async () => {
    if (recording) {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    }
    Vibration.vibrate(50);
    onClose();
  };

  // 檢查是否為無法辨識的轉錄結果
  const isUnrecognizableTranscript = (text: string): boolean => {
    const unrecognizablePatterns = [
      '請使用繁體中文轉錄',
      '無法辨識',
      '聽不清楚',
      '請重新錄音',
    ];
    return unrecognizablePatterns.some(pattern => text.includes(pattern));
  };

  // 儲存草稿
  const saveDraft = async (uri: string, transcriptText: string) => {
    try {
      // 上傳語音
      const uploadResult = await uploadApi.uploadVoice(uri);

      // 建立草稿
      await draftsApi.create({
        voiceUrl: uploadResult.url,
        voiceDuration,
        transcript: transcriptText || '',
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: location || undefined,
      });

      setIsAutoSaved(true);
      setStep('success');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('[Save Draft] Error:', err);
      Alert.alert('儲存失敗', err.response?.data?.message || err.message || '請稍後再試');
      setStep('confirm');
    }
  };

  // 顯示無法辨識對話框
  const showUnrecognizableDialog = (uri: string, transcriptText: string) => {
    Alert.alert(
      '語音無法辨識',
      'AI 無法辨識您的語音內容，請選擇：',
      [
        {
          text: '存為草稿',
          onPress: () => saveDraft(uri, transcriptText),
        },
        {
          text: '手動編輯',
          onPress: () => {
            setMessage('');
            setStep('confirm');
          },
        },
        {
          text: '取消',
          style: 'cancel',
          onPress: () => onClose(),
        },
      ],
    );
  };

  // AI 分析語音
  const analyzeVoice = async (uri: string) => {
    try {
      // 語音轉文字
      const transcribeResult = await uploadApi.transcribeVoice(uri);

      // 檢查是否有 API 回傳的錯誤訊息
      if (transcribeResult?.error) {
        console.log('[AI] Transcription error from API:', transcribeResult.error);
        setTranscript('');
        showUnrecognizableDialog(uri, '');
        return;
      }

      const transcriptText = transcribeResult?.text || '';
      setTranscript(transcriptText);

      // 如果 AI 無法辨識語音，顯示選項對話框
      if (!transcriptText || isUnrecognizableTranscript(transcriptText)) {
        console.log('[AI] Unrecognizable transcript, showing options');
        showUnrecognizableDialog(uri, transcriptText);
        return;
      }

      // 使用 AI 解析轉錄文字，識別車牌等資訊
      if (transcriptText) {
        try {
          const parseResult = await draftsApi.testParse(transcriptText);
          console.log('[AI Parse] Result:', parseResult);

          // 設定 AI 解析結果
          if (parseResult) {
            // 設定車牌候選
            if (parseResult.plates && parseResult.plates.length > 0) {
              setParsedData({
                plates: parseResult.plates,
                vehicle: parseResult.vehicle || { type: 'unknown' },
                event: parseResult.event,
                suggestedMessage: parseResult.suggestedMessage || '',
              });
              // 自動選擇第一個車牌（信心度最高）
              setSelectedPlate(parseResult.plates[0].plate);
            }

            // 設定車輛類型
            if (parseResult.vehicle?.type === 'car' || parseResult.vehicle?.type === 'scooter') {
              setVehicleType(parseResult.vehicle.type);
            }

            // 設定提醒類別
            const categoryMap: Record<string, Category> = {
              'VEHICLE_REMINDER': '車況提醒',
              'SAFETY_REMINDER': '行車安全提醒',
              'PRAISE': '讚美感謝',
            };
            if (parseResult.event?.category && categoryMap[parseResult.event.category]) {
              setCategory(categoryMap[parseResult.event.category]);
            }

            // 設定建議訊息（優先使用 AI 建議，否則使用原始轉錄）
            setMessage(parseResult.suggestedMessage || transcriptText);
          } else {
            // AI 解析失敗，使用原始轉錄
            setMessage(transcriptText);
          }
        } catch (parseErr) {
          console.warn('[AI Parse] Failed, using transcript:', parseErr);
          // AI 解析失敗，使用原始轉錄
          setMessage(transcriptText);
        }
      }

      // 記錄錄製完成時間
      setRecordedAt(new Date().toISOString());

      // 進入選擇階段（存草稿或繼續編輯）
      setStep('choice');
    } catch (err: any) {
      console.error('Analysis error:', err);
      // 記錄錄製完成時間
      setRecordedAt(new Date().toISOString());
      // 即使分析失敗，也進入選擇頁面
      setStep('choice');
    }
  };

  // 播放/暫停語音
  const togglePlayback = async () => {
    if (!voiceUri) return;

    try {
      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: voiceUri },
          { shouldPlay: true },
          (status: any) => {
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          },
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  // 儲存草稿（確認頁面使用）
  const handleSaveDraft = async () => {
    if (!voiceUri) return;

    setIsSaving(true);
    try {
      // 上傳語音
      const uploadResult = await uploadApi.uploadVoice(voiceUri);

      // 建立草稿
      await draftsApi.create({
        voiceUrl: uploadResult.url,
        voiceDuration,
        transcript,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: location || undefined,
      });

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      Alert.alert('錯誤', err.message || '儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  // 直接發送
  const handleSend = async () => {
    const finalPlate = showCustomPlate ? customPlate : selectedPlate;

    if (!finalPlate) {
      Alert.alert('請輸入車牌', '需要車牌號碼才能發送提醒');
      return;
    }

    if (!message.trim()) {
      Alert.alert('請輸入訊息', '需要訊息內容才能發送提醒');
      return;
    }

    setIsSending(true);
    try {
      // 計算發生時間
      const occurredAt = new Date();
      if (timeOption === '5min') occurredAt.setMinutes(occurredAt.getMinutes() - 5);
      if (timeOption === '10min') occurredAt.setMinutes(occurredAt.getMinutes() - 10);
      if (timeOption === '15min') occurredAt.setMinutes(occurredAt.getMinutes() - 15);

      // 組合最終訊息
      const finalMessage = additionalNote
        ? `${message}\n\n補充：${additionalNote}`
        : message;

      // 發送訊息
      await messagesApi.create({
        licensePlate: finalPlate,
        type: category,
        template: finalMessage,
        customText: additionalNote || undefined,
        location: location || undefined,
        occurredAt: occurredAt.toISOString(),
      });

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      Alert.alert('發送失敗', err.message || '請稍後再試');
    } finally {
      setIsSending(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ========== 渲染不同步驟 ==========

  // 錄音中
  const renderRecording = () => (
    <View style={styles.recordingCard}>
      {/* 關閉按鈕 */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={cancelRecording}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      {/* 主要錄音區域 */}
      <View style={styles.recordingMain}>
        {/* 音量感應外圈 */}
        <View style={styles.volumeRingContainer}>
          {/* 外圈光暈 - 隨音量放大 */}
          <Animated.View
            style={[
              styles.volumeRing,
              {
                transform: [{ scale: volumeAnim }],
                opacity: isRecording ? 0.3 : 0,
              },
            ]}
          />
          {/* 內圈麥克風 */}
          <Animated.View
            style={[
              styles.recordingIndicator,
              isRecording && {
                transform: [{
                  scale: volumeAnim.interpolate({
                    inputRange: [1, 1.4],
                    outputRange: [1, 1.15],
                  })
                }],
              },
            ]}
          >
            <Ionicons name="mic" size={48} color="#fff" />
          </Animated.View>
        </View>

        <Text style={styles.recordingDuration}>
          {formatDuration(recordingDuration)}
        </Text>

        <Text style={styles.recordingStatus}>
          {isRecording ? '錄音中...' : '準備錄音'}
        </Text>

        {/* 音量指示條 */}
        {isRecording && (
          <View style={styles.volumeBarContainer}>
            <View style={styles.volumeBarBackground}>
              <View
                style={[
                  styles.volumeBarFill,
                  { width: `${currentVolume * 100}%` },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* 提示文字 */}
      <View style={styles.recordingTip}>
        <Text style={styles.recordingTipText}>
          💡 說出車牌、車型顏色、發生什麼事
        </Text>
        <Text style={styles.recordingExample}>
          例：「白色 Camry ABC-1234 亂切車道」
        </Text>
      </View>

      {/* 完成按鈕 */}
      <TouchableOpacity
        style={[
          styles.finishButton,
          (!isRecording || recordingDuration < 1) && styles.finishButtonDisabled,
        ]}
        onPress={stopRecording}
        disabled={!isRecording || recordingDuration < 1}
      >
        <Ionicons name="checkmark-circle" size={24} color="#fff" />
        <Text style={styles.finishButtonText}>完成錄音</Text>
      </TouchableOpacity>

      <Text style={styles.recordingLimit}>最長 30 秒</Text>
    </View>
  );

  // AI 分析中
  const renderAnalyzing = () => (
    <View style={styles.analyzingCard}>
      <View style={styles.analyzingIconLarge}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
      <Text style={styles.analyzingTitleLarge}>AI 分析中...</Text>
      <Text style={styles.analyzingSubtitleLarge}>正在識別車牌和內容</Text>
    </View>
  );

  // 處理繼續編輯（導航到語音送出頁面）
  const handleContinueEdit = () => {
    if (onNavigateToVoiceSend && voiceUri) {
      onNavigateToVoiceSend({
        voiceUri,
        voiceDuration,
        transcript,
        recordedAt,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: location || undefined,
      });
      onClose();
    } else {
      // 如果沒有傳入導航函數，退回到舊的確認頁面
      setStep('confirm');
    }
  };

  // 選擇頁面（存草稿或繼續編輯）
  const renderChoice = () => (
    <View style={[styles.choiceContainer, { backgroundColor: colors.card.DEFAULT }]}>
      {/* 關閉按鈕 */}
      <TouchableOpacity
        style={styles.choiceCloseButton}
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={28} color={colors.muted.foreground} />
      </TouchableOpacity>

      {/* 標題 */}
      <View style={styles.choiceHeader}>
        <View style={[styles.choiceIconCircle, { backgroundColor: colors.primary.soft }]}>
          <Ionicons name="mic" size={32} color={colors.primary.DEFAULT} />
        </View>
        <Text style={[styles.choiceTitle, { color: colors.foreground }]}>
          錄音完成！
        </Text>
        <Text style={[styles.choiceSubtitle, { color: colors.muted.foreground }]}>
          {voiceDuration} 秒語音已錄製完成
        </Text>
      </View>

      {/* 語音播放預覽 */}
      <View style={[styles.choiceVoicePlayer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.choicePlayButton, { backgroundColor: colors.primary.DEFAULT }]}
          onPress={togglePlayback}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.choiceVoiceInfo}>
          <Text style={[styles.choiceVoiceLabel, { color: colors.muted.foreground }]}>
            語音錄音
          </Text>
          <Text style={[styles.choiceVoiceDuration, { color: colors.foreground }]}>
            {Math.floor(voiceDuration / 60)}:{(voiceDuration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
        {transcript && (
          <Text
            style={[styles.choiceTranscriptPreview, { color: colors.text.muted }]}
            numberOfLines={1}
          >
            「{transcript}」
          </Text>
        )}
      </View>

      {/* 選項按鈕 */}
      <View style={styles.choiceButtons}>
        <TouchableOpacity
          style={[styles.choiceButton, styles.choiceButtonSecondary, { borderColor: colors.border }]}
          onPress={handleSaveDraft}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.muted.foreground} />
          ) : (
            <>
              <Ionicons name="bookmark-outline" size={22} color={colors.muted.foreground} />
              <Text style={[styles.choiceButtonText, { color: colors.foreground }]}>
                存為草稿
              </Text>
              <Text style={[styles.choiceButtonHint, { color: colors.muted.foreground }]}>
                稍後再處理
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.choiceButton, styles.choiceButtonPrimary, { backgroundColor: colors.primary.DEFAULT }]}
          onPress={handleContinueEdit}
        >
          <Ionicons name="send" size={22} color="#fff" />
          <Text style={[styles.choiceButtonText, { color: '#fff' }]}>
            繼續編輯
          </Text>
          <Text style={[styles.choiceButtonHint, { color: 'rgba(255,255,255,0.7)' }]}>
            填寫車牌並送出
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // 確認頁面
  const renderConfirm = () => (
    <View style={[styles.confirmContainer, { backgroundColor: colors.card.DEFAULT }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* 固定標題列 */}
        <View style={[styles.confirmHeaderFixed, { backgroundColor: colors.card.DEFAULT, borderBottomColor: colors.border }]}>
          <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
            確認提醒內容
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.confirmCloseButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={colors.muted.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.confirmScroll}
          contentContainerStyle={styles.confirmContent}
          showsVerticalScrollIndicator={false}
        >

        {/* 語音播放 */}
        <View style={[styles.voicePlayer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.primary.DEFAULT }]}
            onPress={togglePlayback}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.voiceInfo}>
            <Text style={[styles.voiceLabel, { color: colors.muted.foreground }]}>
              原始錄音
            </Text>
            <Text style={[styles.voiceDuration, { color: colors.foreground }]}>
              {formatDuration(voiceDuration)}
            </Text>
          </View>
          {transcript && (
            <Text
              style={[styles.transcriptPreview, { color: colors.text.muted }]}
              numberOfLines={1}
            >
              「{transcript}」
            </Text>
          )}
        </View>

        {/* 車牌選擇 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            車牌號碼 <Text style={{ color: colors.destructive.DEFAULT }}>*</Text>
          </Text>

          {parsedData && parsedData.plates.length > 0 && !showCustomPlate && (
            <View style={styles.platesRow}>
              {parsedData.plates.map((plate) => (
                <TouchableOpacity
                  key={plate.plate}
                  style={[
                    styles.plateChip,
                    {
                      backgroundColor:
                        selectedPlate === plate.plate
                          ? colors.primary.DEFAULT
                          : colors.background,
                      borderColor:
                        selectedPlate === plate.plate
                          ? colors.primary.DEFAULT
                          : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedPlate(plate.plate)}
                >
                  <Text
                    style={[
                      styles.plateChipText,
                      {
                        color:
                          selectedPlate === plate.plate ? '#fff' : colors.foreground,
                      },
                    ]}
                  >
                    {plate.plate}
                  </Text>
                  {plate.confidence >= 0.8 && (
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={selectedPlate === plate.plate ? '#fff' : colors.success.DEFAULT}
                    />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.plateChip,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => setShowCustomPlate(true)}
              >
                <Ionicons name="create-outline" size={16} color={colors.muted.foreground} />
                <Text style={[styles.plateChipText, { color: colors.muted.foreground }]}>
                  其他
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {(showCustomPlate || !parsedData?.plates?.length) && (
            <View style={styles.customPlateRow}>
              <TextInput
                style={[
                  styles.plateInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="輸入車牌號碼"
                placeholderTextColor={colors.text.muted}
                value={customPlate}
                onChangeText={setCustomPlate}
                autoCapitalize="characters"
              />
              {showCustomPlate && (parsedData?.plates?.length ?? 0) > 0 && (
                <TouchableOpacity
                  style={styles.backToChips}
                  onPress={() => {
                    setShowCustomPlate(false);
                    setCustomPlate('');
                  }}
                >
                  <Text style={{ color: colors.primary.DEFAULT }}>選擇候選</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* 車輛類型 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>車輛類型</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor:
                    vehicleType === 'car' ? colors.primary.DEFAULT : colors.background,
                  borderColor:
                    vehicleType === 'car' ? colors.primary.DEFAULT : colors.border,
                },
              ]}
              onPress={() => setVehicleType('car')}
            >
              <Ionicons
                name="car"
                size={20}
                color={vehicleType === 'car' ? '#fff' : colors.foreground}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  { color: vehicleType === 'car' ? '#fff' : colors.foreground },
                ]}
              >
                汽車
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor:
                    vehicleType === 'scooter' ? colors.primary.DEFAULT : colors.background,
                  borderColor:
                    vehicleType === 'scooter' ? colors.primary.DEFAULT : colors.border,
                },
              ]}
              onPress={() => setVehicleType('scooter')}
            >
              <Ionicons
                name="bicycle"
                size={20}
                color={vehicleType === 'scooter' ? '#fff' : colors.foreground}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  { color: vehicleType === 'scooter' ? '#fff' : colors.foreground },
                ]}
              >
                機車
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 提醒類別 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>提醒類別</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor:
                      category === opt.value ? colors.primary.soft : colors.background,
                    borderColor:
                      category === opt.value ? colors.primary.DEFAULT : colors.border,
                  },
                ]}
                onPress={() => setCategory(opt.value)}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={16}
                  color={category === opt.value ? colors.primary.DEFAULT : colors.muted.foreground}
                />
                <Text
                  style={[
                    styles.categoryButtonText,
                    {
                      color:
                        category === opt.value ? colors.primary.DEFAULT : colors.muted.foreground,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 訊息內容 */}
        <View style={styles.fieldSection}>
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              訊息內容 <Text style={{ color: colors.destructive.DEFAULT }}>*</Text>
            </Text>
            <View style={styles.aiTag}>
              <Ionicons name="sparkles" size={12} color={colors.primary.DEFAULT} />
              <Text style={[styles.aiTagText, { color: colors.primary.DEFAULT }]}>
                AI 優化
              </Text>
            </View>
          </View>
          <TextInput
            style={[
              styles.messageInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="輸入要傳達的訊息..."
            placeholderTextColor={colors.text.muted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* 補充說明（可展開） */}
        <View style={styles.fieldSection}>
          {!showAdditionalNote ? (
            <TouchableOpacity
              style={styles.addNoteButton}
              onPress={() => setShowAdditionalNote(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary.DEFAULT} />
              <Text style={[styles.addNoteText, { color: colors.primary.DEFAULT }]}>
                新增補充說明
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                  補充說明
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAdditionalNote(false);
                    setAdditionalNote('');
                  }}
                >
                  <Text style={{ color: colors.muted.foreground, fontSize: 13 }}>
                    移除
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="想額外補充的內容..."
                placeholderTextColor={colors.text.muted}
                value={additionalNote}
                onChangeText={setAdditionalNote}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </>
          )}
        </View>

        {/* 地點與時間 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>事發地點</Text>
          <TextInput
            style={[
              styles.locationInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="輸入地點或由 GPS 自動定位"
            placeholderTextColor={colors.text.muted}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>事發時間</Text>
          <View style={styles.timeRow}>
            {TIME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.timeButton,
                  {
                    backgroundColor:
                      timeOption === opt.value ? colors.primary.DEFAULT : colors.background,
                    borderColor:
                      timeOption === opt.value ? colors.primary.DEFAULT : colors.border,
                  },
                ]}
                onPress={() => setTimeOption(opt.value)}
              >
                <Text
                  style={[
                    styles.timeButtonText,
                    { color: timeOption === opt.value ? '#fff' : colors.foreground },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 底部按鈕 */}
        <View style={styles.confirmButtonRow}>
          <TouchableOpacity
            style={[styles.draftButton, { borderColor: colors.border }]}
            onPress={handleSaveDraft}
            disabled={isSaving || isSending}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.muted.foreground} />
            ) : (
              <>
                <Ionicons name="bookmark-outline" size={18} color={colors.muted.foreground} />
                <Text style={[styles.draftButtonText, { color: colors.muted.foreground }]}>
                  存草稿
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.primary.DEFAULT,
                opacity: isSaving || isSending ? 0.6 : 1,
              },
            ]}
            onPress={handleSend}
            disabled={isSaving || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.sendButtonText}>確認發送</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  // 成功
  const renderSuccess = () => {
    const isDraft = isSaving || isAutoSaved;
    return (
      <View style={styles.successCard}>
        <View style={styles.successIconLarge}>
          <Ionicons name="checkmark" size={64} color="#fff" />
        </View>
        <Text style={styles.successTitleLarge}>
          {isDraft ? '已儲存草稿' : '發送成功'}
        </Text>
        <Text style={styles.successSubtitleLarge}>
          {isAutoSaved
            ? '語音無法辨識，已自動存為草稿'
            : isDraft
            ? '稍後可在草稿中處理'
            : '提醒已成功送出'}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        {step === 'recording' && renderRecording()}
        {step === 'analyzing' && renderAnalyzing()}
        {step === 'choice' && renderChoice()}
        {step === 'confirm' && renderConfirm()}
        {step === 'success' && renderSuccess()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  // ========== 錄音畫面 ==========
  recordingCard: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingMain: {
    alignItems: 'center',
    marginBottom: 48,
  },
  volumeRingContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  volumeRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#EF4444',
  },
  recordingIndicator: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  recordingDuration: {
    fontSize: 56,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    color: '#fff',
    marginBottom: 8,
  },
  recordingStatus: {
    fontSize: 18,
    fontWeight: '500',
    color: '#EF4444',
  },
  volumeBarContainer: {
    marginTop: 16,
    width: 200,
    alignItems: 'center',
  },
  volumeBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 2,
  },
  recordingTip: {
    alignItems: 'center',
    marginBottom: 48,
  },
  recordingTipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  recordingExample: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    gap: 8,
  },
  finishButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  recordingLimit: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 16,
  },
  // ========== 分析中畫面 ==========
  analyzingCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingIconLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  analyzingTitleLarge: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  analyzingSubtitleLarge: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // ========== 選擇畫面 ==========
  choiceContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  choiceCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  choiceHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  choiceIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  choiceTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  choiceSubtitle: {
    fontSize: 15,
  },
  choiceVoicePlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  choicePlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceVoiceInfo: {
    gap: 2,
  },
  choiceVoiceLabel: {
    fontSize: 12,
  },
  choiceVoiceDuration: {
    fontSize: 15,
    fontWeight: '600',
  },
  choiceTranscriptPreview: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
  },
  choiceButtons: {
    width: '100%',
    gap: 12,
  },
  choiceButton: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  choiceButtonSecondary: {
    borderWidth: 1,
  },
  choiceButtonPrimary: {},
  choiceButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  choiceButtonHint: {
    fontSize: 13,
  },
  // ========== 成功畫面 ==========
  successCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitleLarge: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  successSubtitleLarge: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // ========== 舊樣式（供確認頁面使用）==========
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  // 確認頁面
  // ========== 確認頁面 ==========
  confirmContainer: {
    flex: 1,
    width: '100%',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  confirmHeaderFixed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  confirmCloseButton: {
    padding: 4,
  },
  confirmScroll: {
    flex: 1,
    width: '100%',
  },
  confirmContent: {
    padding: 20,
    paddingBottom: 40,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  voicePlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceInfo: {
    flex: 0,
  },
  voiceLabel: {
    fontSize: 12,
  },
  voiceDuration: {
    fontSize: 14,
    fontWeight: '500',
  },
  transcriptPreview: {
    flex: 1,
    fontSize: 12,
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  platesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  plateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  plateChipText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  customPlateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  plateInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  backToChips: {
    padding: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addNoteText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 60,
  },
  locationInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    height: 48,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  confirmButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  draftButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  sendButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // 成功
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
  },
});
