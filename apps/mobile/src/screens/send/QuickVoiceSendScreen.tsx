/**
 * Quick Voice Send Screen
 * 一鍵語音送出頁面
 *
 * 功能：
 * - 播放語音錄音
 * - 輸入車牌、選擇車輛類型
 * - 自動取得當前位置（必須開啟權限）
 * - 顯示錄製完成時間
 * - AI 審核語音內容
 * - 直接送出或堅持送出
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { messagesApi, uploadApi, aiApi, normalizeLicensePlate, displayLicensePlate } from '@bbbeeep/shared';
import type { RootStackParamList } from '../../navigation/types';
import { typography, spacing, borderRadius } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickVoiceSend'>;

export default function QuickVoiceSendScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  // 從 route params 取得語音資料
  const {
    voiceUri,
    voiceDuration,
    transcript,
    recordedAt,
    latitude: initialLat,
    longitude: initialLng,
    address: initialAddress,
  } = route.params;

  // Form state
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<'car' | 'scooter'>('car');

  // Location state
  const [location, setLocation] = useState(initialAddress || '');
  const [latitude, setLatitude] = useState<number | null>(initialLat || null);
  const [longitude, setLongitude] = useState<number | null>(initialLng || null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // AI moderation state
  const [isModeratingVoice, setIsModeratingVoice] = useState(false);
  const [voiceModeration, setVoiceModeration] = useState<{
    isAppropriate: boolean;
    category: string;
    reason?: string;
  } | null>(null);

  // Upload state
  const [uploadedVoiceUrl, setUploadedVoiceUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Send state
  const [isSending, setIsSending] = useState(false);

  // 格式化錄製時間
  const formatRecordedTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day} ${hours}:${minutes}`;
  };

  // 格式化播放時間
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 初始化：取得位置和上傳語音
  useEffect(() => {
    getLocation();
    uploadVoice();
    moderateVoiceContent();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // 取得當前位置
  const getLocation = async () => {
    // 如果已經有位置資料，不需要重新取得
    if (latitude && longitude && location) {
      return;
    }

    setIsLoadingLocation(true);
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (canAskAgain) {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          if (newStatus !== 'granted') {
            setLocationPermissionDenied(true);
            setIsLoadingLocation(false);
            return;
          }
        } else {
          setLocationPermissionDenied(true);
          setIsLoadingLocation(false);
          return;
        }
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      // 反向地理編碼取得地址
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
    } catch (err) {
      console.error('Location error:', err);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // 上傳語音檔案
  const uploadVoice = async () => {
    if (!voiceUri) return;

    setIsUploading(true);
    try {
      const result = await uploadApi.uploadVoice(voiceUri);
      setUploadedVoiceUrl(result.url);
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('上傳失敗', '語音檔案上傳失敗，請稍後再試');
    } finally {
      setIsUploading(false);
    }
  };

  // AI 審核語音內容
  const moderateVoiceContent = async () => {
    if (!transcript) return;

    setIsModeratingVoice(true);
    try {
      const result = await aiApi.moderateContent(transcript);
      setVoiceModeration({
        isAppropriate: result.isAppropriate,
        category: result.category,
        reason: result.reason,
      });
    } catch (err) {
      console.error('Moderation error:', err);
      // 審核失敗時預設為通過
      setVoiceModeration({
        isAppropriate: true,
        category: 'ok',
      });
    } finally {
      setIsModeratingVoice(false);
    }
  };

  // 播放/暫停語音
  const togglePlayback = async () => {
    if (!voiceUri) return;

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
        { uri: voiceUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.error('Playback error:', err);
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

  // 前往設定開啟位置權限
  const openSettings = async () => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  };

  // 發送語音訊息
  const handleSend = async (insist: boolean = false) => {
    // 驗證車牌
    const normalizedPlate = normalizeLicensePlate(licensePlate);
    if (!normalizedPlate) {
      Alert.alert('車牌格式錯誤', '請輸入正確的車牌號碼');
      return;
    }

    // 驗證位置
    if (!location) {
      Alert.alert('缺少位置資訊', '請確保已開啟位置權限');
      return;
    }

    // 驗證語音已上傳
    if (!uploadedVoiceUrl) {
      Alert.alert('請稍候', '語音檔案正在上傳中');
      return;
    }

    setIsSending(true);
    try {
      await messagesApi.create({
        licensePlate: normalizedPlate,
        type: 'VEHICLE_REMINDER', // 語音訊息預設為車況提醒
        template: transcript || '語音訊息',
        voiceUrl: uploadedVoiceUrl,
        voiceDuration: voiceDuration,
        location: location,
        occurredAt: recordedAt,
        insistOriginal: insist,
      });

      // 成功後導航到成功頁面或返回首頁
      navigation.replace('Main');
      Alert.alert('發送成功', '語音提醒已成功送出');
    } catch (err: any) {
      Alert.alert('發送失敗', err.response?.data?.message || '請稍後再試');
    } finally {
      setIsSending(false);
    }
  };

  // 判斷審核狀態
  const moderationPassed = voiceModeration?.isAppropriate && voiceModeration?.category === 'ok';
  const moderationHasIssue = voiceModeration && !voiceModeration.isAppropriate;
  const canSend = !isUploading && !isModeratingVoice && uploadedVoiceUrl && location;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          語音提醒
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 語音播放器 */}
        <View style={[styles.voiceCard, { backgroundColor: colors.primary.soft, borderColor: colors.primary.DEFAULT + '30' }]}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.primary.DEFAULT }]}
            onPress={togglePlayback}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <View style={styles.voiceInfo}>
            <View style={styles.voiceLabelRow}>
              <Ionicons name="mic" size={16} color={colors.primary.DEFAULT} />
              <Text style={[styles.voiceLabel, { color: colors.primary.DEFAULT }]}>
                語音訊息
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary.DEFAULT },
                  { width: `${voiceDuration > 0 ? (playbackPosition / voiceDuration) * 100 : 0}%` },
                ]}
              />
            </View>
            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: colors.muted.foreground }]}>
                {formatDuration(playbackPosition)}
              </Text>
              <Text style={[styles.timeText, { color: colors.muted.foreground }]}>
                {formatDuration(voiceDuration)}
              </Text>
            </View>
          </View>
        </View>

        {/* 轉錄文字預覽 */}
        {transcript && (
          <View style={[styles.transcriptCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
            <Text style={[styles.transcriptLabel, { color: colors.muted.foreground }]}>
              AI 轉錄內容
            </Text>
            <Text style={[styles.transcriptText, { color: colors.foreground }]}>
              「{transcript}」
            </Text>
          </View>
        )}

        {/* 車牌輸入 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            車牌號碼 <Text style={{ color: colors.destructive.DEFAULT }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card.DEFAULT,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="例：ABC-1234"
            placeholderTextColor={colors.muted.foreground}
            value={licensePlate}
            onChangeText={setLicensePlate}
            autoCapitalize="characters"
          />
        </View>

        {/* 車輛類型 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            車輛類型
          </Text>
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
              activeOpacity={0.7}
            >
              <FontAwesome6
                name="car"
                size={18}
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
              activeOpacity={0.7}
            >
              <FontAwesome6
                name="motorcycle"
                size={18}
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

        {/* 位置顯示 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            事發地點 <Text style={{ color: colors.destructive.DEFAULT }}>*</Text>
          </Text>

          {locationPermissionDenied ? (
            <View style={[styles.locationWarning, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
              <Ionicons name="location-outline" size={20} color="#DC2626" />
              <View style={styles.locationWarningContent}>
                <Text style={[styles.locationWarningText, { color: isDark ? '#FECACA' : '#991B1B' }]}>
                  需要位置權限才能發送語音提醒
                </Text>
                <TouchableOpacity onPress={openSettings}>
                  <Text style={[styles.locationWarningLink, { color: colors.primary.DEFAULT }]}>
                    前往設定開啟權限
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : isLoadingLocation ? (
            <View style={[styles.locationLoading, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
              <Text style={[styles.locationLoadingText, { color: colors.muted.foreground }]}>
                正在取得位置...
              </Text>
            </View>
          ) : (
            <View style={[styles.locationDisplay, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
              <Ionicons name="location" size={18} color={colors.primary.DEFAULT} />
              <Text style={[styles.locationText, { color: colors.foreground }]} numberOfLines={2}>
                {location || '無法取得位置'}
              </Text>
            </View>
          )}
        </View>

        {/* 錄製時間 */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            錄製時間
          </Text>
          <View style={[styles.timeDisplay, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={18} color={colors.muted.foreground} />
            <Text style={[styles.timeDisplayText, { color: colors.foreground }]}>
              {formatRecordedTime(recordedAt)}
            </Text>
          </View>
        </View>

        {/* AI 審核狀態 */}
        {isModeratingVoice && (
          <View style={[styles.moderationBox, { backgroundColor: colors.muted.DEFAULT }]}>
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            <Text style={[styles.moderationText, { color: colors.muted.foreground }]}>
              AI 審核中...
            </Text>
          </View>
        )}

        {!isModeratingVoice && moderationPassed && (
          <View style={[styles.moderationBox, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={[styles.moderationText, { color: isDark ? '#6EE7B7' : '#047857' }]}>
              AI 審核通過
            </Text>
          </View>
        )}

        {!isModeratingVoice && moderationHasIssue && (
          <View style={[styles.warningCard, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', borderColor: isDark ? '#DC2626' : '#EF4444' }]}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <View style={styles.warningContent}>
              <Text style={[styles.warningText, { color: isDark ? '#FECACA' : '#991B1B' }]}>
                {voiceModeration?.reason || '內容可能不適合發送'}
              </Text>
              <Text style={[styles.warningHint, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                您仍可選擇堅持發送
              </Text>
            </View>
          </View>
        )}

        {/* 上傳狀態 */}
        {isUploading && (
          <View style={[styles.moderationBox, { backgroundColor: colors.muted.DEFAULT }]}>
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            <Text style={[styles.moderationText, { color: colors.muted.foreground }]}>
              語音上傳中...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 底部按鈕 */}
      <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {canSend && (
          <>
            {moderationPassed || !voiceModeration ? (
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: colors.primary.DEFAULT }]}
                onPress={() => handleSend(false)}
                disabled={isSending}
                activeOpacity={0.8}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.sendButtonText}>發送語音提醒</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.insistButton, { borderColor: colors.border }]}
                onPress={() => handleSend(true)}
                disabled={isSending}
                activeOpacity={0.8}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={colors.foreground} />
                ) : (
                  <>
                    <Ionicons name="volume-high" size={20} color={colors.foreground} />
                    <Text style={[styles.insistButtonText, { color: colors.foreground }]}>
                      堅持使用語音送出
                    </Text>
                    <View style={[styles.pointBadge, { backgroundColor: colors.muted.DEFAULT }]}>
                      <Text style={[styles.pointBadgeText, { color: colors.foreground }]}>8 點</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing[1],
    zIndex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing[5],
    gap: spacing[5],
  },

  // Voice player
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing[4],
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceInfo: {
    flex: 1,
    gap: spacing[2],
  },
  voiceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  voiceLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
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
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: 'monospace',
  },

  // Transcript
  transcriptCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
  transcriptLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
  transcriptText: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
  },

  // Fields
  fieldSection: {
    gap: spacing[2],
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3.5],
    fontSize: typography.fontSize.base,
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
    gap: spacing[2],
    padding: spacing[3.5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  typeButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },

  // Location
  locationWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2.5],
  },
  locationWarningContent: {
    flex: 1,
    gap: spacing[1],
  },
  locationWarningText: {
    fontSize: typography.fontSize.sm,
  },
  locationWarningLink: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3.5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
  locationLoadingText: {
    fontSize: typography.fontSize.sm,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3.5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
  locationText: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },

  // Time display
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3.5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
  timeDisplayText: {
    fontSize: typography.fontSize.base,
  },

  // Moderation
  moderationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  moderationText: {
    fontSize: typography.fontSize.sm,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2.5],
  },
  warningContent: {
    flex: 1,
    gap: spacing[1],
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  warningHint: {
    fontSize: typography.fontSize.xs,
  },

  // Footer
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: borderRadius.xl,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  insistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  insistButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  pointBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  pointBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
  },
});
