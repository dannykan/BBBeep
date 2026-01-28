/**
 * Confirm Screen V2
 * 確認並發送（優化版 - 點數明細只在這裡顯示）
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SendStackParamList } from '../../navigation/types';
import { useSend } from '../../context/SendContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout, CompactStepHeader } from './components';
import {
  messagesApi,
  normalizeLicensePlate,
  displayLicensePlate,
  getTotalPoints,
  uploadApi,
  aiApi,
  activitiesApi,
} from '@bbbeeep/shared';
import { typography, spacing, borderRadius } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapLocationPicker from '../../components/MapLocationPicker';
import AddressAutocomplete from '../../components/AddressAutocomplete';

type Props = NativeStackScreenProps<SendStackParamList, 'Confirm'>;

export default function ConfirmScreenV2({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const {
    vehicleType,
    targetPlate,
    selectedCategory,
    generatedMessage,
    customText,
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
    voiceMemo,
  } = useSend();
  const { colors, isDark } = useTheme();

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const dateScrollRef = useRef<ScrollView>(null);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // Helper: 取得某日期是「幾天前」（0 = 今天, 1 = 昨天, ...）
  const getDaysAgo = useCallback((date: Date, now: Date) => {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((nowOnly.getTime() - dateOnly.getTime()) / (24 * 60 * 60 * 1000));
  }, []);

  // 滾動到指定位置的函數
  const scrollPickersToTime = useCallback((date: Date, animated: boolean = true) => {
    const now = new Date();
    const daysAgo = getDaysAgo(date, now);
    const dayIndex = Math.min(Math.max(daysAgo, 0), 6);
    const hour = date.getHours();
    const minuteIndex = Math.floor(date.getMinutes() / 5);

    dateScrollRef.current?.scrollTo({ y: dayIndex * 44, animated });
    hourScrollRef.current?.scrollTo({ y: hour * 44, animated });
    minuteScrollRef.current?.scrollTo({ y: minuteIndex * 44, animated });
  }, [getDaysAgo]);

  // 當 picker 開啟時，滾動到選中的位置
  useEffect(() => {
    if (showDatePicker) {
      // 延遲執行滾動，等待 Modal 完全打開
      setTimeout(() => {
        scrollPickersToTime(occurredAt, false);
      }, 150);
    }
  }, [showDatePicker, scrollPickersToTime]);

  // 當 occurredAt 改變時，滾動到新位置
  useEffect(() => {
    if (showDatePicker) {
      scrollPickersToTime(occurredAt, true);
    }
  }, [occurredAt, showDatePicker, scrollPickersToTime]);

  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Auto-fill location and time from voiceMemo
  useEffect(() => {
    if (voiceMemo) {
      // Auto-fill location if available and not already set
      if (voiceMemo.address && !location) {
        setLocation(
          voiceMemo.address,
          voiceMemo.latitude || undefined,
          voiceMemo.longitude || undefined
        );
      } else if (voiceMemo.latitude && voiceMemo.longitude && !location) {
        // If we have coordinates but no address, use coordinates as fallback
        reverseGeocode(voiceMemo.latitude, voiceMemo.longitude).then((address) => {
          setLocation(address, voiceMemo.latitude, voiceMemo.longitude);
        });
      }

      // Auto-fill time from recording time
      if (voiceMemo.recordedAt) {
        setOccurredAt(new Date(voiceMemo.recordedAt));
        setSelectedTimeOption('custom');
      }
    }
  }, [voiceMemo]);

  const pointCost = getPointCost();
  const finalMessage = getFinalMessage();
  const userPoints = getTotalPoints(user);
  const canAfford = userPoints >= pointCost;
  const remainingPoints = userPoints - pointCost;

  const handleTimeOptionSelect = (option: 'now' | '5min' | '10min' | '15min' | 'custom') => {
    if (option === 'custom') {
      setShowDatePicker(true);
      return;
    }

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


  const formatCustomTime = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

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
          onPlaybackStatusUpdate,
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
      .replace(/\d{3,6}/g, '')
      .replace(/^\s*,\s*/, '')
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/, '')
      .trim();
  };

  // Reverse geocode
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
      const { status: existingStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();
      if (existingStatus !== 'granted') {
        if (canAskAgain) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setIsGettingLocation(false);
            return;
          }
        } else {
          Alert.alert('需要位置權限', '請前往設定開啟位置權限', [
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
          ]);
          setIsGettingLocation(false);
          return;
        }
      }
      const locationResult = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
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
      Alert.alert('請填寫地點', '需要事發地點才能發送提醒');
      return;
    }

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

      let uploadedVoiceUrl: string | undefined;
      let voiceDuration: number | undefined;

      if (sendMode === 'voice' && voiceRecording) {
        try {
          const uploadResult = await uploadApi.uploadVoice(voiceRecording.uri);
          uploadedVoiceUrl = uploadResult.url;
          voiceDuration = voiceRecording.duration;
          setVoiceUrl(uploadResult.url);
        } catch (uploadError: any) {
          Alert.alert('錯誤', uploadError.response?.data?.message || '上傳語音失敗');
          setIsLoading(false);
          return;
        }
      }

      const isOtherCase =
        selectedCategory === '其他情況' ||
        (selectedCategory === '讚美感謝' && !generatedMessage);

      let templateContent = isOtherCase ? customText : generatedMessage || customText;
      let customTextContent: string | undefined;

      // 模板模式：不發送 customText，純使用模板
      if (sendMode === 'template') {
        templateContent = generatedMessage;
        customTextContent = undefined;
      } else if (voiceRecording && sendMode !== 'voice') {
        // 語音轉文字模式
        templateContent = voiceRecording.transcript;
        customTextContent = undefined;
      } else if (!isOtherCase) {
        // 一般文字模式：如果 customText 與 generatedMessage 不同，才發送
        customTextContent = customText && customText !== generatedMessage ? customText : undefined;
      } else {
        // 其他情況
        customTextContent = undefined;
      }

      const createdMessage = await messagesApi.create({
        licensePlate: normalizedPlate,
        type:
          selectedCategory === '其他情況'
            ? '行車安全提醒'
            : selectedCategory === '行車安全'
            ? '行車安全提醒'
            : (selectedCategory as any),
        template: templateContent,
        customText: customTextContent,
        useAiRewrite: useAiVersion || sendMode === 'ai',
        location: location || undefined,
        occurredAt: occurredAt.toISOString(),
        voiceUrl: uploadedVoiceUrl,
        voiceDuration: voiceDuration,
      });

      // 背景記錄發送成功活動（不阻塞 UI）
      activitiesApi.recordSent({
        messageText: finalMessage || customText || '',
        voiceUrl: uploadedVoiceUrl,
        voiceDuration: voiceDuration,
        transcript: voiceRecording?.transcript,
        targetPlate: normalizedPlate,
        vehicleType: vehicleType || 'car',
        category: selectedCategory || '',
        sendMode: sendMode,
        messageId: createdMessage.id,
        latitude: locationLatitude,
        longitude: locationLongitude,
        location: location || undefined,
      }).catch((err) => {
        console.log('[Activity] Failed to log MESSAGE_SENT:', err);
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

  const presetTimeOptions = [
    { id: 'now', label: '剛剛' },
    { id: '5min', label: '5 分鐘前' },
    { id: '10min', label: '10 分鐘前' },
    { id: '15min', label: '15 分鐘前' },
  ] as const;

  // Get category display info (matching CategoryScreenV2 design)
  const getCategoryInfo = () => {
    switch (selectedCategory) {
      case '車況提醒':
        return { icon: 'alert-circle-outline', iconColor: '#F59E0B', iconBgColor: '#FEF3C7', label: '車況提醒' };
      case '行車安全':
        return { icon: 'shield-checkmark-outline', iconColor: colors.primary.DEFAULT, iconBgColor: '#DBEAFE', label: '行車安全' };
      case '讚美感謝':
        return { icon: 'heart', iconColor: '#22C55E', iconBgColor: '#DCFCE7', label: '讚美感謝' };
      default:
        return { icon: 'chatbubble-outline', iconColor: '#A855F7', iconBgColor: '#F3E8FF', label: '其他' };
    }
  };

  const categoryInfo = getCategoryInfo();

  return (
    <SendLayout currentStep={4} totalSteps={4}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <CompactStepHeader title="確認發送" subtitle="請確認以下資訊" />

        {/* Main info card */}
        <View style={[styles.mainCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
          {/* Target */}
          <View style={styles.cardRow}>
            <View style={styles.cardIconContainer}>
              <FontAwesome6
                name={vehicleType === 'car' ? 'car' : 'motorcycle'}
                size={18}
                color={colors.primary.DEFAULT}
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardLabel, { color: colors.muted.foreground }]}>對象車牌</Text>
              <Text style={[styles.cardValue, { color: colors.foreground }]}>
                {displayLicensePlate(targetPlate)}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Category */}
          <View style={styles.cardRow}>
            <View style={[styles.cardIconContainer, { backgroundColor: categoryInfo.iconBgColor }]}>
              <Ionicons name={categoryInfo.icon as any} size={18} color={categoryInfo.iconColor} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardLabel, { color: colors.muted.foreground }]}>提醒類型</Text>
              <Text style={[styles.cardValue, { color: categoryInfo.iconColor }]}>{categoryInfo.label}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Message or Voice */}
          {sendMode === 'voice' && voiceRecording ? (
            <>
              <View style={styles.messageRow}>
                <Text style={[styles.cardLabel, { color: colors.muted.foreground }]}>語音提醒</Text>
                <View style={[styles.voiceTag, { backgroundColor: colors.primary.DEFAULT + '20' }]}>
                  <Ionicons name="mic" size={12} color={colors.primary.DEFAULT} />
                  <Text style={[styles.aiTagText, { color: colors.primary.DEFAULT }]}>語音</Text>
                </View>
              </View>
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
                  <Text style={[styles.transcriptLabel, { color: colors.muted.foreground }]}>語音轉文字（僅供預覽）</Text>
                  <Text style={[styles.transcriptText, { color: colors.foreground }]}>{voiceRecording.transcript}</Text>
                  <View style={styles.transcriptNote}>
                    <Ionicons name="information-circle-outline" size={14} color={colors.muted.foreground} />
                    <Text style={[styles.transcriptNoteText, { color: colors.muted.foreground }]}>
                      收件方只會收到語音，不會看到此文字內容
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.messageRow}>
                <Text style={[styles.cardLabel, { color: colors.muted.foreground }]}>提醒內容</Text>
                {(useAiVersion || sendMode === 'ai') && (
                  <View style={[styles.aiTag, { backgroundColor: colors.primary.DEFAULT + '20' }]}>
                    <Ionicons name="sparkles" size={12} color={colors.primary.DEFAULT} />
                    <Text style={[styles.aiTagText, { color: colors.primary.DEFAULT }]}>AI 優化</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.messageText, { color: colors.foreground }]}>
                {finalMessage || customText || '（無訊息內容）'}
              </Text>
            </>
          )}
        </View>

        {/* Location */}
        <View style={[styles.fieldSection, styles.locationFieldSection]}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="location-outline" size={16} color={colors.muted.foreground} />
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>事發地點</Text>
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

        <MapLocationPicker
          visible={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onConfirm={(locationData) => {
            setLocation(locationData.address, locationData.latitude, locationData.longitude);
          }}
          initialLocation={
            locationLatitude && locationLongitude
              ? { address: location, latitude: locationLatitude, longitude: locationLongitude }
              : undefined
          }
        />

        {/* Time */}
        <View style={styles.fieldSection}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="time-outline" size={16} color={colors.muted.foreground} />
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>發生時間</Text>
          </View>

          {/* Preset time options */}
          <View style={styles.timeOptions}>
            {presetTimeOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.timeOption,
                  { backgroundColor: colors.card.DEFAULT, borderColor: colors.border },
                  selectedTimeOption === option.id && {
                    backgroundColor: colors.primary.DEFAULT,
                    borderColor: colors.primary.DEFAULT,
                  },
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

          {/* Custom time button */}
          <TouchableOpacity
            style={[
              styles.customTimeButton,
              { backgroundColor: colors.card.DEFAULT, borderColor: colors.border },
              selectedTimeOption === 'custom' && {
                backgroundColor: colors.primary.soft,
                borderColor: colors.primary.DEFAULT,
              },
            ]}
            onPress={() => handleTimeOptionSelect('custom')}
            activeOpacity={0.7}
          >
            <View style={styles.customTimeLeft}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={selectedTimeOption === 'custom' ? colors.primary.DEFAULT : colors.muted.foreground}
              />
              <Text
                style={[
                  styles.customTimeLabel,
                  { color: selectedTimeOption === 'custom' ? colors.primary.DEFAULT : colors.foreground },
                ]}
              >
                其他時間
              </Text>
            </View>
            <View style={styles.customTimeRight}>
              {selectedTimeOption === 'custom' && (
                <Text style={[styles.customTimeValue, { color: colors.primary.DEFAULT }]}>
                  {formatCustomTime(occurredAt)}
                </Text>
              )}
              <Ionicons
                name="chevron-forward"
                size={18}
                color={selectedTimeOption === 'custom' ? colors.primary.DEFAULT : colors.muted.foreground}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Custom Date/Time Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModalOverlay}>
            <TouchableOpacity
              style={styles.datePickerModalDismiss}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            />
            <View style={[styles.datePickerModalContent, { backgroundColor: colors.card.DEFAULT }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerCancel, { color: colors.muted.foreground }]}>取消</Text>
                </TouchableOpacity>
                <Text style={[styles.datePickerTitle, { color: colors.foreground }]}>選擇時間</Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTimeOption('custom');
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[styles.datePickerDone, { color: colors.primary.DEFAULT }]}>完成</Text>
                </TouchableOpacity>
              </View>

              {/* Picker with center highlight */}
              <View style={styles.pickerWrapper}>
                {/* Center highlight bar */}
                <View style={[styles.pickerHighlight, { backgroundColor: colors.primary.soft }]} />

                <View style={styles.pickerContainer}>
                  {/* Date Picker (Year/Month/Day) */}
                  <ScrollView
                    ref={dateScrollRef}
                    style={styles.pickerColumnWide}
                    contentContainerStyle={styles.pickerColumnContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={44}
                    decelerationRate="fast"
                  >
                    <View style={styles.pickerSpacer} />
                    {Array.from({ length: 7 }, (_, i) => {
                      const now = new Date();
                      // 建立該天的日期（只保留年月日）
                      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                      const selectedDaysAgo = getDaysAgo(occurredAt, now);
                      const isSelected = selectedDaysAgo === i;

                      // 格式化日期顯示
                      const month = targetDate.getMonth() + 1;
                      const day = targetDate.getDate();
                      const label = i === 0 ? `${month}/${day} 今天` : `${month}/${day}`;

                      return (
                        <TouchableOpacity
                          key={i}
                          style={styles.pickerItem}
                          onPress={() => {
                            // 建立新日期：保留選中的年月日，時分從 occurredAt 繼承
                            const newDate = new Date(targetDate);
                            newDate.setHours(occurredAt.getHours(), occurredAt.getMinutes(), 0, 0);
                            // 如果選擇今天且時間超過現在，調整到現在
                            if (i === 0 && newDate > now) {
                              newDate.setHours(now.getHours(), Math.floor(now.getMinutes() / 5) * 5, 0, 0);
                            }
                            setOccurredAt(newDate);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              { color: isSelected ? colors.primary.DEFAULT : colors.muted.foreground },
                              isSelected && styles.pickerItemTextSelected,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <View style={styles.pickerSpacer} />
                  </ScrollView>

                  {/* Hour Picker */}
                  <ScrollView
                    ref={hourScrollRef}
                    style={styles.pickerColumn}
                    contentContainerStyle={styles.pickerColumnContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={44}
                    decelerationRate="fast"
                  >
                    <View style={styles.pickerSpacer} />
                    {(() => {
                      const now = new Date();

                      return Array.from({ length: 24 }, (_, i) => {
                        const isSelected = occurredAt.getHours() === i;
                        return (
                          <TouchableOpacity
                            key={i}
                            style={styles.pickerItem}
                            onPress={() => {
                              const newDate = new Date(occurredAt);
                              newDate.setHours(i);
                              // 如果選擇的時間是未來，自動調整到前一天
                              if (newDate > now) {
                                newDate.setDate(newDate.getDate() - 1);
                              }
                              setOccurredAt(newDate);
                            }}
                          >
                            <Text
                              style={[
                                styles.pickerItemText,
                                { color: isSelected ? colors.primary.DEFAULT : colors.muted.foreground },
                                isSelected && styles.pickerItemTextSelected,
                              ]}
                            >
                              {i.toString().padStart(2, '0')} 時
                            </Text>
                          </TouchableOpacity>
                        );
                      });
                    })()}
                    <View style={styles.pickerSpacer} />
                  </ScrollView>

                  {/* Minute Picker */}
                  <ScrollView
                    ref={minuteScrollRef}
                    style={styles.pickerColumn}
                    contentContainerStyle={styles.pickerColumnContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={44}
                    decelerationRate="fast"
                  >
                    <View style={styles.pickerSpacer} />
                    {(() => {
                      const now = new Date();

                      return Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => {
                        const isSelected = Math.floor(occurredAt.getMinutes() / 5) * 5 === minute;
                        return (
                          <TouchableOpacity
                            key={minute}
                            style={styles.pickerItem}
                            onPress={() => {
                              const newDate = new Date(occurredAt);
                              newDate.setMinutes(minute);
                              // 如果選擇的時間是未來，自動調整到前一天
                              if (newDate > now) {
                                newDate.setDate(newDate.getDate() - 1);
                              }
                              setOccurredAt(newDate);
                            }}
                          >
                            <Text
                              style={[
                                styles.pickerItemText,
                                { color: isSelected ? colors.primary.DEFAULT : colors.muted.foreground },
                                isSelected && styles.pickerItemTextSelected,
                              ]}
                            >
                              {minute.toString().padStart(2, '0')} 分
                            </Text>
                          </TouchableOpacity>
                        );
                      });
                    })()}
                    <View style={styles.pickerSpacer} />
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Point cost breakdown - ONLY SHOWN HERE */}
        <View style={[styles.costCard, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
          <View style={styles.costHeader}>
            <Ionicons name="wallet-outline" size={18} color={colors.text.primary} />
            <Text style={[styles.costTitle, { color: colors.text.primary }]}>費用明細</Text>
          </View>

          <View style={styles.costRow}>
            <Text style={[styles.costLabel, { color: colors.text.secondary }]}>
              發送提醒
              {sendMode === 'template' && '（模板）'}
              {(useAiVersion || sendMode === 'ai') && '（AI 優化）'}
              {sendMode === 'voice' && '（語音）'}
              {sendMode === 'text' && '（自訂文字）'}
            </Text>
            <Text style={[styles.costValue, { color: colors.text.primary }]}>
              {pointCost === 0 ? '免費' : `${pointCost} 點`}
            </Text>
          </View>

          <View style={[styles.costDivider, { backgroundColor: colors.border }]} />

          <View style={styles.costRow}>
            <Text style={[styles.costLabel, { color: colors.text.secondary }]}>目前餘額</Text>
            <Text style={[styles.costValue, { color: colors.text.primary }]}>{userPoints} 點</Text>
          </View>

          <View style={[styles.costRow, { marginTop: 4 }]}>
            <Text style={[styles.costLabel, { color: colors.text.primary, fontWeight: '600' }]}>
              發送後餘額
            </Text>
            <Text
              style={[
                styles.costValue,
                { color: canAfford ? colors.primary.DEFAULT : colors.destructive.DEFAULT, fontWeight: '600' },
              ]}
            >
              {remainingPoints} 點
            </Text>
          </View>
        </View>

        {/* Warning if not enough points */}
        {!canAfford && (
          <View style={[styles.warningCard, { backgroundColor: colors.destructive.DEFAULT + '15' }]}>
            <Ionicons name="alert-circle" size={18} color={colors.destructive.DEFAULT} />
            <Text style={[styles.warningText, { color: colors.destructive.DEFAULT }]}>
              點數不足，請先儲值
            </Text>
          </View>
        )}

        {/* Confirm button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: colors.primary.DEFAULT },
            (isLoading || !canAfford || !location.trim()) && styles.buttonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={isLoading || !canAfford || !location.trim()}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary.foreground} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={colors.primary.foreground} />
              <Text style={[styles.confirmButtonText, { color: colors.primary.foreground }]}>
                確認發送
              </Text>
              <View style={styles.pointBadge}>
                <Text style={styles.pointBadgeText}>
                  {pointCost === 0 ? '免費' : `${pointCost} 點`}
                </Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  mainCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[0.5],
  },
  cardValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  divider: {
    height: 1,
    marginVertical: spacing[3],
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  aiTagText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
  voiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  voicePlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  transcriptLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing[1],
  },
  transcriptText: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  transcriptNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  transcriptNoteText: {
    fontSize: typography.fontSize.xs,
    flex: 1,
  },
  messageText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.6,
  },
  fieldSection: {
    marginBottom: spacing[4],
  },
  locationFieldSection: {
    zIndex: 1000,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  nearbyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginLeft: 'auto',
  },
  nearbyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nearbyText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
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
    borderRadius: borderRadius.xl,
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
    paddingVertical: spacing[2.5],
  },
  timeOptionText: {
    fontSize: typography.fontSize.sm,
  },
  customTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  customTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  customTimeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  customTimeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  customTimeValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  costCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  costTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  costDivider: {
    height: 1,
    marginVertical: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  costLabel: {
    fontSize: 14,
  },
  costValue: {
    fontSize: 14,
    textAlign: 'right',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    marginBottom: spacing[4],
  },
  confirmButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  pointBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    marginLeft: spacing[2],
  },
  pointBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Date picker modal styles (iOS)
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalDismiss: {
    flex: 1,
  },
  datePickerModalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing[8],
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  datePickerCancel: {
    fontSize: typography.fontSize.base,
  },
  datePickerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  datePickerDone: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  pickerWrapper: {
    height: 220,
    position: 'relative',
  },
  pickerHighlight: {
    position: 'absolute',
    top: 88, // (220 - 44) / 2 = 88
    left: spacing[3],
    right: spacing[3],
    height: 44,
    borderRadius: borderRadius.lg,
    zIndex: 0,
  },
  pickerContainer: {
    flexDirection: 'row',
    flex: 1,
    paddingHorizontal: spacing[2],
  },
  pickerColumn: {
    flex: 1,
  },
  pickerColumnWide: {
    flex: 1.5,
  },
  pickerColumnContent: {
    alignItems: 'center',
  },
  pickerSpacer: {
    height: 88, // Same as top offset of highlight
  },
  pickerItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
  },
  pickerItemText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    fontWeight: typography.fontWeight.semibold as any,
  },
});
