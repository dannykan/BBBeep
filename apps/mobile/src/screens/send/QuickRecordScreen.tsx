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

type Step = 'recording' | 'choose' | 'success';

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

  // 轉錄結果（僅用於草稿預覽）
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Loading 狀態
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedAsDraft, setSavedAsDraft] = useState(false);

  // 播放狀態
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  // 預載音訊（錄音完成後）
  useEffect(() => {
    if (!voiceUri || step !== 'choose') return;

    let isMounted = true;
    const preloadAudio = async () => {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: voiceUri },
          { shouldPlay: false },
          (status: any) => {
            if (status.didJustFinish && isMounted) {
              setIsPlaying(false);
            }
          }
        );
        if (isMounted) {
          setSound(newSound);
          setIsAudioLoaded(true);
        } else {
          newSound.unloadAsync();
        }
      } catch (err) {
        console.error('Audio preload error:', err);
      }
    };

    preloadAudio();

    return () => {
      isMounted = false;
    };
  }, [voiceUri, step]);

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
        // 直接進入選擇畫面，不再顯示「處理中」
        setStep('choose');
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

      // 優化的語音錄音設定（檔案大小約為 HIGH_QUALITY 的 1/4）
      const recordingOptions: Audio.RecordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 22050,  // 語音足夠（原 44100）
          numberOfChannels: 1, // 單聲道（原 2）
          bitRate: 64000,     // 語音足夠（原 128000）
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM, // 語音足夠（原 MAX）
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

  // 儲存草稿（上傳語音 + 背景轉錄）
  const handleSaveDraft = async () => {
    if (!voiceUri) return;

    setIsSavingDraft(true);
    try {
      // 1. 先上傳語音檔案
      const uploadResult = await uploadApi.uploadVoice(voiceUri);

      // 2. 建立草稿（先不帶 transcript）
      const draft = await draftsApi.create({
        voiceUrl: uploadResult.url,
        voiceDuration,
        transcript: '',
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: address || undefined,
      });

      // 3. 背景執行轉錄（不阻塞 UI）
      setIsTranscribing(true);
      uploadApi.transcribeVoice(voiceUri)
        .then(async (transcribeResult) => {
          const transcriptText = transcribeResult?.text || '';
          if (transcriptText && draft?.id) {
            // 更新草稿的 transcript
            try {
              await draftsApi.update(draft.id, { transcript: transcriptText });
            } catch (e) {
              console.warn('[Transcribe] Failed to update draft:', e);
            }
          }
        })
        .catch((err) => {
          console.warn('[Transcribe] Background transcription error:', err);
        })
        .finally(() => {
          setIsTranscribing(false);
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

  // 現在發送（進入一鍵語音送出頁面）
  const handleSendNow = () => {
    if (!voiceUri) return;

    // 導航到一鍵語音送出頁面（不需要 transcript）
    navigation.replace('QuickVoiceSend', {
      voiceUri,
      voiceDuration,
      transcript: '', // 發送流程不需要顯示轉錄
      recordedAt: new Date().toISOString(),
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      address: address || undefined,
    });
  };

  // 播放/暫停語音（使用預載的音訊，無延遲）
  const togglePlayback = async () => {
    if (!voiceUri || !sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
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
            style={[
              styles.playButtonLarge,
              { backgroundColor: colors.primary.DEFAULT },
              !isAudioLoaded && { opacity: 0.7 },
            ]}
            onPress={togglePlayback}
            disabled={!isAudioLoaded}
          >
            {!isAudioLoaded ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#fff" />
            )}
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

            <Text style={[styles.voiceCardTranscript, { color: colors.muted.foreground }]}>
              點擊播放收聽錄音內容
            </Text>

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

        {/* 標題 */}
        <Text style={[styles.chooseTitle, { color: colors.foreground }]}>
          接下來要做什麼？
        </Text>

        {/* 按鈕區 - 主要行動放前面 */}
        <View style={styles.buttonGroup}>
          {/* 現在發送 - 主要按鈕 */}
          <TouchableOpacity
            style={[styles.primaryActionButton, { backgroundColor: colors.primary.DEFAULT }]}
            onPress={handleSendNow}
            activeOpacity={0.8}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="send" size={20} color="#fff" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionButtonTitle}>現在發送</Text>
                <Text style={styles.actionButtonSubtitle}>填寫車牌，立即送出提醒</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </View>
          </TouchableOpacity>

          {/* 稍後再發 - 次要按鈕 */}
          <TouchableOpacity
            style={[
              styles.secondaryActionButton,
              { backgroundColor: colors.card.DEFAULT, borderColor: colors.border },
              isSavingDraft && { opacity: 0.6 },
            ]}
            onPress={handleSaveDraft}
            disabled={isSavingDraft}
            activeOpacity={0.8}
          >
            {isSavingDraft ? (
              <View style={styles.actionButtonContent}>
                <ActivityIndicator size="small" color={colors.foreground} />
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionButtonTitle, { color: colors.foreground }]}>儲存中...</Text>
                </View>
              </View>
            ) : (
              <View style={styles.actionButtonContent}>
                <View style={[styles.actionIconContainer, { backgroundColor: colors.muted.DEFAULT }]}>
                  <Ionicons name="time-outline" size={20} color={colors.foreground} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionButtonTitle, { color: colors.foreground }]}>稍後再發</Text>
                  <Text style={[styles.actionButtonSubtitle, { color: colors.muted.foreground }]}>
                    先存起來，之後從首頁繼續
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted.foreground} />
              </View>
            )}
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
  chooseTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    textAlign: 'center',
    marginTop: spacing[6],
    marginBottom: spacing[4],
  },
  buttonGroup: {
    gap: spacing[3],
  },
  primaryActionButton: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  secondaryActionButton: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
    gap: spacing[0.5],
  },
  actionButtonTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    color: '#fff',
  },
  actionButtonSubtitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
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
