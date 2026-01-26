/**
 * Confirm Screen
 * 確認並發送
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, StepHeader } from './components';
import { messagesApi, normalizeLicensePlate, displayLicensePlate, getTotalPoints, uploadApi } from '@bbbeeep/shared';
import { aiApi } from '@bbbeeep/shared';
import { typography, spacing, borderRadius } from '../../theme';
import MapLocationPicker from '../../components/MapLocationPicker';
import AddressAutocomplete from '../../components/AddressAutocomplete';

type Props = NativeStackScreenProps<SendStackParamList, 'Confirm'>;

export default function ConfirmScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const {
    targetPlate,
    selectedCategory,
    selectedSituation,
    generatedMessage,
    customText,
    aiSuggestion,
    useAiVersion,
    usedAi,
    location,
    locationLatitude,
    locationLongitude,
    setLocation,
    occurredAt,
    selectedTimeOption,
    setSelectedTimeOption,
    setOccurredAt,
    setAiLimit,
    isLoading,
    setIsLoading,
    getPointCost,
    getFinalMessage,
    validateContent,
    voiceRecording,
    sendMode,
    setVoiceUrl,
    isVoiceMode,
  } = useSend();
  const { colors, isDark } = useTheme();

  // Voice playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Map location picker state
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Google Maps API key for reverse geocoding
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const pointCost = getPointCost();
  const finalMessage = getFinalMessage();
  const canAfford = getTotalPoints(user) >= pointCost;

  const handleTimeOptionSelect = (option: 'now' | '5min' | '10min' | '15min') => {
    setSelectedTimeOption(option);
    const now = new Date();
    switch (option) {
      case 'now':
        setOccurredAt(now);
        break;
      case '5min':
        setOccurredAt(new Date(now.getTime() - 5 * 60 * 1000));
        break;
      case '10min':
        setOccurredAt(new Date(now.getTime() - 10 * 60 * 1000));
        break;
      case '15min':
        setOccurredAt(new Date(now.getTime() - 15 * 60 * 1000));
        break;
    }
  };

  // Voice playback functions
  const toggleVoicePlayback = async () => {
    if (!voiceRecording) return;

    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: voiceRecording.uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        soundRef.current = sound;
        setIsPlaying(true);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Voice playback error:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPlaybackPosition(status.positionMillis / 1000);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPlaybackPosition(0);
      soundRef.current?.setPositionAsync(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Simplify Taiwan address
  const simplifyAddress = (address: string): string => {
    return address
      .replace(/,\s*台灣$/, '')
      .replace(/台灣/g, '')
      .replace(/\d{3,6}/g, '') // Remove postal codes
      .replace(/^\s*,\s*/, '')
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/, '')
      .trim();
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(async (latitude: number, longitude: number): Promise<string> => {
    if (!googleMapsApiKey) {
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsApiKey}&language=zh-TW`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return simplifyAddress(data.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }

    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }, [googleMapsApiKey]);

  // Get current location
  const handleGetCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true);

    try {
      // Check permission
      const { status: existingStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();

      if (existingStatus !== 'granted') {
        if (canAskAgain) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setIsGettingLocation(false);
            return;
          }
        } else {
          Alert.alert(
            '需要位置權限',
            '請前往「設定」→「UBeep」→ 開啟「位置」權限',
            [
              { text: '取消', style: 'cancel' },
              {
                text: '前往設定',
                onPress: async () => {
                  if (Platform.OS === 'ios') {
                    await Linking.openURL('app-settings:');
                  } else {
                    await Linking.openSettings();
                  }
                },
              },
            ]
          );
          setIsGettingLocation(false);
          return;
        }
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = locationResult.coords;
      const address = await reverseGeocode(latitude, longitude);
      setLocation(address, latitude, longitude);
    } catch (error) {
      console.error('Get location error:', error);
      Alert.alert('錯誤', '無法取得目前位置');
    } finally {
      setIsGettingLocation(false);
    }
  }, [reverseGeocode, setLocation]);

  const handleConfirm = async () => {
    if (!canAfford) {
      Alert.alert('點數不足', '請先儲值', [
        { text: '取消', style: 'cancel' },
        { text: '去儲值', onPress: () => navigation.getParent()?.navigate('Wallet') },
      ]);
      return;
    }

    if (!selectedCategory || !targetPlate) {
      Alert.alert('錯誤', '請完成所有步驟');
      return;
    }

    if (!location.trim()) {
      Alert.alert('錯誤', '請填寫事發地點');
      return;
    }

    const isOtherCase =
      selectedCategory === '其他情況' ||
      (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise');

    if (!isOtherCase && !generatedMessage) {
      Alert.alert('錯誤', '請完成所有步驟');
      return;
    }

    if (isOtherCase && (!customText.trim() || customText.trim().length < 5)) {
      Alert.alert('錯誤', '說明內容至少需要 5 個字');
      return;
    }

    // Content filter validation (final check)
    if (customText.trim()) {
      const validation = validateContent(customText);
      if (!validation.isValid) {
        Alert.alert('內容不當', validation.message || '請修改內容後再試');
        return;
      }
    }

    setIsLoading(true);
    try {
      const normalizedPlate = normalizeLicensePlate(targetPlate);
      if (!normalizedPlate) {
        Alert.alert('錯誤', '車牌號碼格式無效');
        setIsLoading(false);
        return;
      }

      // Handle voice upload if sending as voice
      let uploadedVoiceUrl: string | undefined;
      let voiceDuration: number | undefined;

      if (sendMode === 'voice' && voiceRecording) {
        try {
          // Upload voice file to R2
          const uploadResult = await uploadApi.uploadVoice(voiceRecording.uri);
          uploadedVoiceUrl = uploadResult.url;
          voiceDuration = voiceRecording.duration;
          setVoiceUrl(uploadResult.url);
        } catch (uploadError: any) {
          console.error('Voice upload failed:', uploadError);
          Alert.alert('錯誤', uploadError.response?.data?.message || '上傳語音失敗');
          setIsLoading(false);
          return;
        }
      }

      // Determine the template/message content
      let templateContent = isOtherCase ? customText : generatedMessage || customText;
      let customTextContent = isOtherCase ? undefined : customText || undefined;

      // If sending voice transcript as text or AI-optimized
      if (voiceRecording && sendMode !== 'voice') {
        templateContent = voiceRecording.transcript;
        customTextContent = undefined;
      }

      await messagesApi.create({
        licensePlate: normalizedPlate,
        type:
          selectedCategory === '其他情況'
            ? '行車安全提醒'
            : selectedCategory === '行車安全'
            ? '行車安全提醒'
            : (selectedCategory as any),
        template: templateContent,
        customText: customTextContent,
        useAiRewrite: usedAi,
        location: location || undefined,
        occurredAt: occurredAt.toISOString(),
        voiceUrl: uploadedVoiceUrl,
        voiceDuration: voiceDuration,
      });

      try {
        const resetResult = await aiApi.resetLimit();
        setAiLimit(resetResult);
      } catch (error) {
        console.error('Failed to reset AI limit:', error);
      }

      await refreshUser();
      navigation.navigate('Success');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '發送失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const timeOptions = [
    { id: 'now', label: '剛剛' },
    { id: '5min', label: '5 分鐘前' },
    { id: '10min', label: '10 分鐘前' },
    { id: '15min', label: '15 分鐘前' },
  ] as const;

  // Warning colors for dark mode
  const warningBgColor = isDark ? `${colors.destructive.DEFAULT}30` : `${colors.destructive.DEFAULT}10`;

  return (
    <SendLayout currentStep={5} totalSteps={5}>
      <StepHeader title="確認並發送" subtitle="請確認以下資訊" />

      {/* Target plate */}
      <View style={[styles.infoCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}>
        <Text style={[styles.infoLabel, { color: colors.muted.foreground }]}>對象車牌</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{displayLicensePlate(targetPlate)}</Text>
      </View>

      {/* Message preview */}
      {sendMode === 'voice' && voiceRecording ? (
        <View style={[styles.voiceCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}>
          <Text style={[styles.messageLabel, { color: colors.muted.foreground }]}>語音提醒</Text>
          <View style={styles.voicePlayer}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: colors.primary.DEFAULT }]}
              onPress={toggleVoicePlayback}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color={colors.primary.foreground}
              />
            </TouchableOpacity>
            <View style={styles.voiceInfo}>
              <View style={[styles.progressBar, { backgroundColor: colors.muted.DEFAULT }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary.DEFAULT,
                      width: voiceRecording.duration > 0
                        ? `${(playbackPosition / voiceRecording.duration) * 100}%`
                        : '0%',
                    },
                  ]}
                />
              </View>
              <View style={styles.timeRow}>
                <Text style={[styles.timeText, { color: colors.muted.foreground }]}>
                  {formatDuration(playbackPosition)}
                </Text>
                <Text style={[styles.timeText, { color: colors.muted.foreground }]}>
                  {formatDuration(voiceRecording.duration)}
                </Text>
              </View>
            </View>
          </View>
          {voiceRecording.transcript && (
            <View style={[styles.transcriptPreview, { backgroundColor: colors.muted.DEFAULT }]}>
              <Text style={[styles.transcriptLabel, { color: colors.muted.foreground }]}>語音轉文字</Text>
              <Text style={[styles.transcriptText, { color: colors.foreground }]}>{voiceRecording.transcript}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.messageCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}>
          <Text style={[styles.messageLabel, { color: colors.muted.foreground }]}>提醒內容</Text>
          <Text style={[styles.messageText, { color: colors.foreground }]}>{finalMessage}</Text>
        </View>
      )}

      {/* Location input */}
      <View style={[styles.inputSection, styles.locationSection]}>
        <View style={styles.inputLabelRow}>
          <Ionicons name="location-outline" size={16} color={colors.muted.foreground} />
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>事發地點</Text>
        </View>

        {/* Two buttons: Current Location + Map Select */}
        <View style={styles.locationButtonsRow}>
          <TouchableOpacity
            style={[styles.locationOptionButton, { backgroundColor: colors.muted.DEFAULT }]}
            onPress={handleGetCurrentLocation}
            disabled={isGettingLocation}
            activeOpacity={0.7}
          >
            {isGettingLocation ? (
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            ) : (
              <>
                <Ionicons name="navigate" size={16} color={colors.foreground} />
                <Text style={[styles.locationOptionText, { color: colors.foreground }]}>目前位置</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.locationOptionButton, { backgroundColor: colors.muted.DEFAULT }]}
            onPress={() => setShowMapPicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={16} color={colors.foreground} />
            <Text style={[styles.locationOptionText, { color: colors.foreground }]}>地圖選擇</Text>
          </TouchableOpacity>
        </View>

        {/* Editable address input with autocomplete */}
        <AddressAutocomplete
          value={location}
          onChangeText={(text, lat, lng) => setLocation(text, lat, lng)}
          placeholder="輸入或選擇地點..."
        />
      </View>

      {/* Map Location Picker Modal */}
      <MapLocationPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={(locationData) => {
          setLocation(locationData.address, locationData.latitude, locationData.longitude);
        }}
        initialLocation={locationLatitude && locationLongitude ? {
          address: location,
          latitude: locationLatitude,
          longitude: locationLongitude,
        } : undefined}
      />

      {/* Time selection */}
      <View style={styles.inputSection}>
        <View style={styles.inputLabelRow}>
          <Ionicons name="time-outline" size={16} color={colors.muted.foreground} />
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>發生時間</Text>
        </View>
        <View style={styles.timeOptions}>
          {timeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.timeOption,
                { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid },
                selectedTimeOption === option.id && { backgroundColor: colors.primary.DEFAULT, borderColor: colors.primary.DEFAULT },
              ]}
              onPress={() => handleTimeOptionSelect(option.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeOptionText,
                  { color: colors.foreground },
                  selectedTimeOption === option.id && { color: colors.primary.foreground },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Point cost warning */}
      {!canAfford && (
        <View style={[styles.warningCard, { backgroundColor: warningBgColor }]}>
          <Ionicons name="alert-circle" size={16} color={colors.destructive.DEFAULT} />
          <Text style={[styles.warningText, { color: colors.destructive.DEFAULT }]}>點數不足，請先儲值</Text>
        </View>
      )}

      {/* Confirm button */}
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary.DEFAULT }, (isLoading || !canAfford || !location.trim()) && styles.buttonDisabled]}
        onPress={handleConfirm}
        disabled={isLoading || !canAfford || !location.trim()}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary.foreground} />
        ) : (
          <>
            <Text style={[styles.primaryButtonText, { color: colors.primary.foreground }]}>確認發送</Text>
            <View style={styles.pointBadge}>
              <Text style={[styles.pointBadgeText, { color: colors.primary.foreground }]}>{pointCost === 0 ? '免費' : `${pointCost} 點`}</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[1],
  },
  infoValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
  },
  messageCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  messageLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[2],
  },
  messageText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  voiceCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  voicePlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceInfo: {
    flex: 1,
    gap: spacing[1],
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
    fontVariant: ['tabular-nums'],
  },
  transcriptPreview: {
    marginTop: spacing[3],
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  transcriptLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[1],
  },
  transcriptText: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  inputSection: {
    marginBottom: spacing[4],
  },
  locationSection: {
    zIndex: 1000,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
  },
  locationButtonsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  locationOptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.lg,
  },
  locationOptionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  locationInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.sm,
    minHeight: 48,
    textAlignVertical: 'center',
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  timeOption: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  timeOptionText: {
    fontSize: typography.fontSize.sm,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  warningText: {
    fontSize: typography.fontSize.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[4],
  },
  primaryButtonText: {
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
  buttonDisabled: {
    opacity: 0.5,
  },
});
