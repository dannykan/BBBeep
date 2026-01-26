/**
 * QuickRecordScreen - 快速錄音頁面
 *
 * 流程：錄音 → 選擇（儲存草稿 / 繼續編輯）
 * 如果選擇「繼續編輯」，會帶著語音備忘進入手動發送流程
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Vibration,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useSend } from '../../context/SendContext';
import { uploadApi, draftsApi } from '@bbbeeep/shared';
import { typography, spacing, borderRadius } from '../../theme';

type Step = 'recording' | 'processing' | 'choose' | 'success';

const MAX_RECORDING_DURATION = 30;

export default function QuickRecordScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { setVoiceMemo, resetSend } = useSend();

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

  // 位置資料
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');

  // 轉錄結果（用於顯示，但不再依賴它來判斷內容）
  const [transcript, setTranscript] = useState('');

  // Loading 狀態
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedAsDraft, setSavedAsDraft] = useState(false);

  // 播放狀態
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 進入頁面時自動開始錄音
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      const timer = setTimeout(() => {
        if (AppState.currentState === 'active') {
          console.log('[Recording] Auto-start triggered');
          startRecordingRef.current?.();
        } else {
          console.log('[Recording] App not active, skipping auto-start');
          navigation.goBack();
        }
      }, 300);
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
        setStep('processing');
        await processRecording(uri);
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

      if (AppState.currentState !== 'active') {
        console.log('[Recording] App not active, waiting...');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      Vibration.vibrate(50);

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

      let duration = 0;
      durationInterval.current = setInterval(() => {
        duration += 1;
        setRecordingDuration(duration);

        if (duration >= MAX_RECORDING_DURATION) {
          if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
          }
          stopRecordingRef.current?.();
        }
      }, 1000);
    } catch (err: any) {
      console.error('[Recording] Error:', err);
      if (err.message?.includes('background') || err.message?.includes('audio session could not be activated')) {
        console.log('[Recording] Background error, going back silently');
        navigation.goBack();
        return;
      }
      Alert.alert('錯誤', err.message || '無法開始錄音');
      navigation.goBack();
    }
  };

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
          const addressStr = [addr.city, addr.district, addr.street].filter(Boolean).join('');
          setAddress(addressStr);
        }
      }
    } catch (err) {
      console.warn('Could not get location:', err);
    }
  };

  // 停止錄音
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

  // 處理錄音完成（嘗試轉錄，但不依賴結果）
  const processRecording = async (uri: string) => {
    try {
      // 嘗試轉錄，僅供參考用
      const transcribeResult = await uploadApi.transcribeVoice(uri);
      const transcriptText = transcribeResult?.text || '';
      setTranscript(transcriptText);
    } catch (err) {
      console.warn('[Transcribe] Error:', err);
      // 轉錄失敗不影響流程
    }

    setStep('choose');
  };

  // 儲存草稿
  const handleSaveDraft = async () => {
    if (!voiceUri) return;

    setIsSavingDraft(true);
    try {
      const uploadResult = await uploadApi.uploadVoice(voiceUri);
      await draftsApi.create({
        voiceUrl: uploadResult.url,
        voiceDuration,
        transcript: transcript || '',
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: address || undefined,
      });

      setSavedAsDraft(true);
      setStep('success');
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err: any) {
      console.error('[Save Draft] Error:', err);
      Alert.alert('儲存失敗', err.response?.data?.message || err.message || '請稍後再試');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 繼續編輯（進入手動發送流程）
  const handleContinueEdit = () => {
    if (!voiceUri) return;

    // 重置現有發送資料
    resetSend();

    // 設定語音備忘
    setVoiceMemo({
      uri: voiceUri,
      duration: voiceDuration,
      transcript: transcript || undefined,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      address: address || undefined,
      recordedAt: new Date(),
    });

    // 導航到發送流程
    navigation.replace('Send');
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
          記錄發生的事情和相關細節
        </Text>
        <Text style={styles.recordingExample}>
          例如車牌、車型、顏色、事件描述等
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

  // 處理中
  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <View style={styles.processingIcon}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
      <Text style={styles.processingTitle}>處理中...</Text>
      <Text style={styles.processingSubtitle}>正在準備您的錄音</Text>
    </View>
  );

  // 選擇畫面
  const renderChoose = () => (
    <View style={[styles.chooseContainer, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.chooseHeader}>
        <TouchableOpacity
          style={[styles.headerCloseButton, { backgroundColor: colors.muted.DEFAULT }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.chooseContent}>
        {/* 錄音卡片 */}
        <View style={[styles.voiceCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.playButtonLarge, { backgroundColor: colors.primary.DEFAULT }]}
            onPress={togglePlayback}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.voiceCardInfo}>
            <View style={styles.voiceCardHeader}>
              <View style={styles.voiceLabelRow}>
                <Ionicons name="mic" size={16} color={colors.primary.DEFAULT} />
                <Text style={[styles.voiceCardLabel, { color: colors.primary.DEFAULT }]}>
                  語音備忘
                </Text>
              </View>
              <Text style={[styles.voiceCardDuration, { color: colors.muted.foreground }]}>
                {formatDuration(voiceDuration)}
              </Text>
            </View>

            {transcript ? (
              <Text
                style={[styles.voiceCardTranscript, { color: colors.muted.foreground }]}
                numberOfLines={2}
              >
                「{transcript}」
              </Text>
            ) : (
              <Text style={[styles.voiceCardTranscript, { color: colors.muted.foreground }]}>
                點擊播放收聽錄音內容
              </Text>
            )}

            {(address || latitude) && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={12} color={colors.muted.foreground} />
                <Text style={[styles.locationText, { color: colors.muted.foreground }]}>
                  {address || `${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 說明文字 */}
        <Text style={[styles.chooseDescription, { color: colors.muted.foreground }]}>
          您可以稍後再來編輯發送，或現在繼續填寫發送資料
        </Text>

        {/* 按鈕區 */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.draftButton,
              { backgroundColor: colors.card.DEFAULT, borderColor: colors.border },
              isSavingDraft && { opacity: 0.6 },
            ]}
            onPress={handleSaveDraft}
            disabled={isSavingDraft}
          >
            {isSavingDraft ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <>
                <Ionicons name="bookmark-outline" size={20} color={colors.foreground} />
                <Text style={[styles.draftButtonText, { color: colors.foreground }]}>儲存草稿</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.primary.DEFAULT }]}
            onPress={handleContinueEdit}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editButtonText}>繼續編輯</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // 成功
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={64} color="#fff" />
      </View>
      <Text style={styles.successTitle}>
        {savedAsDraft ? '已儲存草稿' : '完成'}
      </Text>
      <Text style={styles.successSubtitle}>
        {savedAsDraft ? '稍後可在草稿中處理' : ''}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {step === 'recording' && renderRecording()}
      {step === 'processing' && renderProcessing()}
      {step === 'choose' && renderChoose()}
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
  // ========== 處理中畫面 ==========
  processingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  processingSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // ========== 選擇畫面 ==========
  chooseContainer: {
    flex: 1,
  },
  chooseHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  headerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseContent: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing[4],
  },
  playButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceCardInfo: {
    flex: 1,
    gap: spacing[1.5],
  },
  voiceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  voiceCardLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  voiceCardDuration: {
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
  },
  voiceCardTranscript: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  locationText: {
    fontSize: typography.fontSize.xs,
  },
  chooseDescription: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing[6],
    marginBottom: spacing[4],
    lineHeight: typography.fontSize.sm * 1.6,
  },
  buttonGroup: {
    gap: spacing[3],
  },
  draftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
  draftButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  editButtonText: {
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
