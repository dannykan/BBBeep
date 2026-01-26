/**
 * QuickRecordScreen - 快速錄音頁面
 *
 * 流程：錄音 → AI 轉文字 → 確認編輯 → 發送
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Vibration,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { uploadApi, messagesApi, activitiesApi } from '@bbbeeep/shared';
import { typography, spacing, borderRadius } from '../../theme';

type Step = 'recording' | 'analyzing' | 'confirm' | 'success';
type VehicleType = 'car' | 'scooter';
type MessageType = 'VEHICLE_REMINDER' | 'SAFETY_REMINDER' | 'PRAISE';
type TimeOption = 'now' | '5min' | '10min' | '15min';

const MAX_RECORDING_DURATION = 30;

const MESSAGE_TYPE_OPTIONS: { value: MessageType; label: string; icon: string }[] = [
  { value: 'VEHICLE_REMINDER', label: '車況提醒', icon: 'car-outline' },
  { value: 'SAFETY_REMINDER', label: '行車安全', icon: 'warning-outline' },
  { value: 'PRAISE', label: '讚美感謝', icon: 'heart-outline' },
];

const TIME_OPTIONS: { value: TimeOption; label: string }[] = [
  { value: 'now', label: '現在' },
  { value: '5min', label: '5分鐘前' },
  { value: '10min', label: '10分鐘前' },
  { value: '15min', label: '15分鐘前' },
];

export default function QuickRecordScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { refreshUser } = useAuth();

  // 步驟狀態
  const [step, setStep] = useState<Step>('recording');

  // 錄音狀態
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const hasStartedRef = useRef(false);
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const startRecordingRef = useRef<(() => void) | null>(null);

  // 音量動畫
  const volumeAnim = useRef(new Animated.Value(1)).current;
  const [currentVolume, setCurrentVolume] = useState(0);

  // 轉錄結果
  const [transcript, setTranscript] = useState('');

  // 用戶編輯欄位
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [messageType, setMessageType] = useState<MessageType>('SAFETY_REMINDER');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [timeOption, setTimeOption] = useState<TimeOption>('now');

  // Loading 狀態
  const [isSending, setIsSending] = useState(false);

  // 語音播放
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 進入頁面時自動開始錄音
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      // 使用 setTimeout 確保所有函數都已定義
      const timer = setTimeout(() => {
        console.log('[Recording] Auto-start triggered');
        startRecordingRef.current?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (sound) {
        sound.unloadAsync();
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, [sound]);

  // 處理停止錄音
  const handleStopRecording = async () => {
    const currentRecording = recordingRef.current;
    if (!currentRecording) {
      console.log('[Recording] No recording to stop');
      return;
    }

    try {
      console.log('[Recording] Stopping...');

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      const status = await currentRecording.getStatusAsync();
      const uri = currentRecording.getURI();
      const duration = Math.ceil((status.durationMillis || 0) / 1000);

      console.log('[Recording] Duration:', duration, 'URI:', uri);

      Vibration.vibrate(50);
      await currentRecording.stopAndUnloadAsync();

      recordingRef.current = null;
      setRecording(null);
      setIsRecording(false);
      setVoiceUri(uri);
      setVoiceDuration(duration > 0 ? duration : 1);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (uri && duration >= 1) {
        setStep('analyzing');
        await analyzeVoice(uri);
      } else {
        Alert.alert('錄音太短', '請至少錄製 1 秒');
        navigation.goBack();
      }
    } catch (err: any) {
      console.error('[Recording] Stop error:', err);
      Alert.alert('錯誤', err.message || '錄音失敗');
      navigation.goBack();
    }
  };

  // 儲存 stopRecording ref
  stopRecordingRef.current = handleStopRecording;

  // 開始錄音
  const startRecording = async () => {
    try {
      console.log('[Recording] Starting...');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      Vibration.vibrate(50);

      // 設定錄音選項
      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            const normalizedVolume = Math.max(0, Math.min(1, (status.metering + 60) / 60));
            setCurrentVolume(normalizedVolume);

            Animated.timing(volumeAnim, {
              toValue: 1 + normalizedVolume * 0.4,
              duration: 100,
              useNativeDriver: true,
            }).start();
          }
        },
        100
      );

      console.log('[Recording] Started successfully');
      recordingRef.current = newRecording;
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // 同時取得位置
      getLocation();

      // 使用 local duration 變數來追蹤時間
      let duration = 0;
      durationInterval.current = setInterval(() => {
        duration += 1;
        setRecordingDuration(duration);
        console.log('[Recording] Duration tick:', duration);

        if (duration >= MAX_RECORDING_DURATION) {
          // 達到最大時間，自動停止
          if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
          }
          // 使用 ref 來呼叫最新的 stopRecording
          stopRecordingRef.current?.();
        }
      }, 1000);
    } catch (err: any) {
      console.error('[Recording] Error:', err);
      Alert.alert('錯誤', err.message || '無法開始錄音');
      navigation.goBack();
    }
  };

  // 儲存 startRecording ref
  startRecordingRef.current = startRecording;

  // 取得位置
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
          const address = [addr.city, addr.district, addr.street].filter(Boolean).join('');
          setLocation(address);
        }
      }
    } catch (err) {
      console.warn('Could not get location:', err);
    }
  };

  // 停止錄音（包裝 handleStopRecording）
  const stopRecording = () => {
    handleStopRecording();
  };

  // 取消錄音
  const cancelRecording = async () => {
    const currentRecording = recordingRef.current;
    if (currentRecording) {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      try {
        await currentRecording.stopAndUnloadAsync();
      } catch (e) {
        // 忽略錯誤
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      recordingRef.current = null;
      setRecording(null);
      setIsRecording(false);
    }
    Vibration.vibrate(50);
    navigation.goBack();
  };

  // AI 分析語音
  const analyzeVoice = async (uri: string) => {
    try {
      const transcribeResult = await uploadApi.transcribeVoice(uri);
      const transcriptText = transcribeResult?.text || '';
      setTranscript(transcriptText);

      if (transcriptText) {
        setMessage(transcriptText);
      }

      // 背景記錄錄音完成活動（不阻塞 UI）
      activitiesApi.recordRecording({
        voiceUrl: uri,
        voiceDuration: voiceDuration,
        transcript: transcriptText,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        location: location || undefined,
      }).catch((err) => {
        console.log('[Activity] Failed to log RECORDING_COMPLETE:', err);
      });

      setStep('confirm');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setStep('confirm');
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
          }
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  // 發送
  const handleSend = async () => {
    if (!licensePlate.trim()) {
      Alert.alert('請輸入車牌', '需要車牌號碼才能發送提醒');
      return;
    }

    if (!message.trim()) {
      Alert.alert('請輸入訊息', '需要訊息內容才能發送提醒');
      return;
    }

    setIsSending(true);
    try {
      const occurredAt = new Date();
      if (timeOption === '5min') occurredAt.setMinutes(occurredAt.getMinutes() - 5);
      if (timeOption === '10min') occurredAt.setMinutes(occurredAt.getMinutes() - 10);
      if (timeOption === '15min') occurredAt.setMinutes(occurredAt.getMinutes() - 15);

      const normalizedPlate = licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, '');

      const createdMessage = await messagesApi.create({
        licensePlate: normalizedPlate,
        vehicleType,
        type: messageType,
        template: message,
        location: location || undefined,
        occurredAt: occurredAt.toISOString(),
      });

      // 背景記錄發送成功活動（不阻塞 UI）
      activitiesApi.recordSent({
        messageText: message,
        voiceUrl: voiceUri || undefined,
        voiceDuration: voiceDuration || undefined,
        transcript: transcript || undefined,
        targetPlate: normalizedPlate,
        vehicleType: vehicleType,
        category: messageType === 'VEHICLE_REMINDER' ? '車況提醒' : messageType === 'SAFETY_REMINDER' ? '行車安全' : '讚美感謝',
        sendMode: 'voice',
        messageId: createdMessage.id,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        location: location || undefined,
      }).catch((err) => {
        console.log('[Activity] Failed to log MESSAGE_SENT:', err);
      });

      setStep('success');
      await refreshUser();

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err: any) {
      Alert.alert('發送失敗', err.response?.data?.message || err.message || '請稍後再試');
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
    <View style={styles.recordingContainer}>
      {/* 關閉按鈕 */}
      <SafeAreaView edges={['top']} style={styles.recordingHeader}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={cancelRecording}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* 主要錄音區域 */}
      <View style={styles.recordingMain}>
        <View style={styles.volumeRingContainer}>
          <Animated.View
            style={[
              styles.volumeRing,
              {
                transform: [{ scale: volumeAnim }],
                opacity: isRecording ? 0.3 : 0,
              },
            ]}
          />
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

      <Text style={styles.recordingLimit}>最長 {MAX_RECORDING_DURATION} 秒</Text>
    </View>
  );

  // AI 分析中
  const renderAnalyzing = () => (
    <View style={styles.analyzingContainer}>
      <View style={styles.analyzingIcon}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
      <Text style={styles.analyzingTitle}>AI 分析中...</Text>
      <Text style={styles.analyzingSubtitle}>正在將語音轉為文字</Text>
    </View>
  );

  // 確認頁面
  const renderConfirm = () => (
    <SafeAreaView style={[styles.confirmContainer, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 標題列 */}
      <View style={[styles.confirmHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
          確認提醒內容
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.confirmScroll}
          contentContainerStyle={styles.confirmContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 語音播放 */}
          {voiceUri && (
            <View style={[styles.voicePlayer, { backgroundColor: colors.card.DEFAULT }]}>
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
                <Text style={[styles.voiceDurationText, { color: colors.foreground }]}>
                  {formatDuration(voiceDuration)}
                </Text>
              </View>
              {transcript && (
                <Text
                  style={[styles.transcriptPreview, { color: colors.muted.foreground }]}
                  numberOfLines={1}
                >
                  「{transcript}」
                </Text>
              )}
            </View>
          )}

          {/* 車牌號碼 */}
          <View style={styles.fieldSection}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              車牌號碼 <Text style={{ color: colors.destructive.DEFAULT }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.input.background,
                  borderColor: colors.input.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="輸入車牌號碼"
              placeholderTextColor={colors.input.placeholder}
              value={licensePlate}
              onChangeText={setLicensePlate}
              autoCapitalize="characters"
            />
          </View>

          {/* 車輛類型 */}
          <View style={styles.fieldSection}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>車輛類型</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: vehicleType === 'car' ? colors.primary.DEFAULT : colors.card.DEFAULT,
                    borderColor: vehicleType === 'car' ? colors.primary.DEFAULT : colors.border,
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
                    backgroundColor: vehicleType === 'scooter' ? colors.primary.DEFAULT : colors.card.DEFAULT,
                    borderColor: vehicleType === 'scooter' ? colors.primary.DEFAULT : colors.border,
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
              {MESSAGE_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: messageType === opt.value ? colors.primary.soft : colors.card.DEFAULT,
                      borderColor: messageType === opt.value ? colors.primary.DEFAULT : colors.border,
                    },
                  ]}
                  onPress={() => setMessageType(opt.value)}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={16}
                    color={messageType === opt.value ? colors.primary.DEFAULT : colors.muted.foreground}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      {
                        color: messageType === opt.value ? colors.primary.DEFAULT : colors.muted.foreground,
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
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              訊息內容 <Text style={{ color: colors.destructive.DEFAULT }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.messageInput,
                {
                  backgroundColor: colors.input.background,
                  borderColor: colors.input.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="輸入要傳達的訊息..."
              placeholderTextColor={colors.input.placeholder}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* 事發地點 */}
          <View style={styles.fieldSection}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>事發地點</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.input.background,
                  borderColor: colors.input.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="輸入地點或由 GPS 自動定位"
              placeholderTextColor={colors.input.placeholder}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* 事發時間 */}
          <View style={styles.fieldSection}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>事發時間</Text>
            <View style={styles.timeRow}>
              {TIME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.timeButton,
                    {
                      backgroundColor: timeOption === opt.value ? colors.primary.DEFAULT : colors.card.DEFAULT,
                      borderColor: timeOption === opt.value ? colors.primary.DEFAULT : colors.border,
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
        </ScrollView>

        {/* 底部按鈕 */}
        <View style={[styles.confirmFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary.DEFAULT },
              isSending && { opacity: 0.6 },
            ]}
            onPress={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>確認發送</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // 成功
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={64} color="#fff" />
      </View>
      <Text style={styles.successTitle}>發送成功</Text>
      <Text style={styles.successSubtitle}>提醒已成功送出</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {step === 'recording' && renderRecording()}
      {step === 'analyzing' && renderAnalyzing()}
      {step === 'confirm' && renderConfirm()}
      {step === 'success' && renderSuccess()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // ========== 錄音畫面 ==========
  recordingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  recordingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  closeButton: {
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
  analyzingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  analyzingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  analyzingSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // ========== 確認頁面 ==========
  confirmContainer: {
    flex: 1,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  confirmTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
  },
  confirmScroll: {
    flex: 1,
  },
  confirmContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  voicePlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    gap: spacing[3],
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
    fontSize: typography.fontSize.xs,
  },
  voiceDurationText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  transcriptPreview: {
    flex: 1,
    fontSize: typography.fontSize.xs,
  },
  fieldSection: {
    marginBottom: spacing[4],
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    marginBottom: spacing[2],
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    height: 48,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
  typeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[1],
  },
  categoryButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: typography.fontSize.base,
    minHeight: 100,
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  timeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  timeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  confirmFooter: {
    padding: spacing[4],
    borderTopWidth: 1,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  sendButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    color: '#fff',
  },
  // ========== 成功畫面 ==========
  successContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
