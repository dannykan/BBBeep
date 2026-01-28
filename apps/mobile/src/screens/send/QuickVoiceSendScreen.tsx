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
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { messagesApi, uploadApi, aiApi, draftsApi, normalizeLicensePlate, displayLicensePlate, getTotalPoints } from '@bbbeeep/shared';
import type { RootStackParamList } from '../../navigation/types';
import { typography, spacing, borderRadius } from '../../theme';
import MapLocationPicker from '../../components/MapLocationPicker';
import AddressAutocomplete from '../../components/AddressAutocomplete';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickVoiceSend'>;

type ReminderCategory = '車況提醒' | '行車安全' | '讚美感謝' | '其他情況';

interface CategoryOption {
  id: ReminderCategory;
  title: string;
  icon: string;
  iconColor: string;
  iconBgColor: string;
  apiType: 'VEHICLE_REMINDER' | 'SAFETY_REMINDER' | 'PRAISE' | 'OTHER';
}

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
  const [selectedCategory, setSelectedCategory] = useState<ReminderCategory>('車況提醒');

  // Category options
  const categories: CategoryOption[] = [
    {
      id: '車況提醒',
      title: '車況提醒',
      icon: 'alert-circle-outline',
      iconColor: '#F59E0B',
      iconBgColor: '#FEF3C7',
      apiType: 'VEHICLE_REMINDER',
    },
    {
      id: '行車安全',
      title: '行車安全',
      icon: 'shield-checkmark-outline',
      iconColor: '#3B82F6',
      iconBgColor: '#DBEAFE',
      apiType: 'SAFETY_REMINDER',
    },
    {
      id: '讚美感謝',
      title: '讚美感謝',
      icon: 'heart',
      iconColor: '#22C55E',
      iconBgColor: '#DCFCE7',
      apiType: 'PRAISE',
    },
    {
      id: '其他情況',
      title: '其他情況',
      icon: 'chatbubble-ellipses-outline',
      iconColor: '#8B5CF6',
      iconBgColor: '#EDE9FE',
      apiType: 'OTHER',
    },
  ];

  // Location state
  const [location, setLocation] = useState(initialAddress || '');
  const [latitude, setLatitude] = useState<number | null>(initialLat || null);
  const [longitude, setLongitude] = useState<number | null>(initialLng || null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Google Maps API Key
  const googleMapsApiKey = Constants.expoConfig?.extra?.googleMapsApiKey || '';

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
    getLocationOnInit();
    uploadVoice();
    moderateVoiceContent();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // 設定位置資料的 helper function
  const setLocationData = useCallback((address: string, lat?: number, lng?: number) => {
    setLocation(address);
    if (lat !== undefined) setLatitude(lat);
    if (lng !== undefined) setLongitude(lng);
  }, []);

  // 反向地理編碼（使用 Google Maps API）
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    if (!googleMapsApiKey) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleMapsApiKey}&language=zh-TW&region=tw`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        let address = data.results[0].formatted_address;
        // 移除郵遞區號和國家名稱
        address = address.replace(/\d{3,5}(台灣)?/g, '').replace(/Taiwan/g, '').trim();
        // 移除開頭的逗號
        address = address.replace(/^,\s*/, '');
        return address;
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }

    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }, [googleMapsApiKey]);

  // 取得當前位置（初始化時呼叫）
  const getLocationOnInit = async () => {
    // 如果已經有位置資料，不需要重新取得
    if (initialLat && initialLng && initialAddress) {
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

      const { latitude: lat, longitude: lng } = loc.coords;
      setLatitude(lat);
      setLongitude(lng);

      const address = await reverseGeocode(lat, lng);
      setLocation(address);
    } catch (err) {
      console.error('Location error:', err);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // 取得當前位置（按鈕點擊時呼叫）
  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (canAskAgain) {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          if (newStatus !== 'granted') {
            setLocationPermissionDenied(true);
            Alert.alert('需要位置權限', '請在設定中開啟位置權限');
            setIsLoadingLocation(false);
            return;
          }
        } else {
          setLocationPermissionDenied(true);
          Alert.alert(
            '需要位置權限',
            '您之前拒絕了位置權限。請前往設定開啟位置權限。',
            [
              { text: '取消', style: 'cancel' },
              { text: '前往設定', onPress: openSettings },
            ]
          );
          setIsLoadingLocation(false);
          return;
        }
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude: lat, longitude: lng } = loc.coords;
      const address = await reverseGeocode(lat, lng);
      setLocationData(address, lat, lng);
    } catch (err) {
      console.error('Location error:', err);
      Alert.alert('錯誤', '無法取得目前位置');
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

  // 儲存草稿並導航到錢包
  const saveAndGoToWallet = async () => {
    try {
      // 儲存草稿
      await draftsApi.create({
        voiceUrl: uploadedVoiceUrl!,
        voiceDuration: voiceDuration,
        transcript: transcript,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: location || undefined,
      });

      Alert.alert(
        '點數不足',
        '您的語音已儲存至草稿，儲值後可繼續發送。',
        [
          {
            text: '前往儲值',
            onPress: () => navigation.replace('Wallet'),
          },
        ]
      );
    } catch (err) {
      console.error('Save draft error:', err);
      Alert.alert('儲存失敗', '無法儲存草稿，請稍後再試');
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

    // 檢查點數是否足夠（語音訊息需要 8 點）
    const totalPoints = getTotalPoints(user);
    if (totalPoints < 8) {
      await saveAndGoToWallet();
      return;
    }

    setIsSending(true);
    try {
      // 取得選中類別的 API 類型
      const categoryApiType = categories.find(c => c.id === selectedCategory)?.apiType || 'VEHICLE_REMINDER';

      await messagesApi.create({
        licensePlate: normalizedPlate,
        type: categoryApiType,
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
      const errorMessage = err.response?.data?.message || '請稍後再試';

      // 如果是點數不足錯誤，儲存草稿
      if (errorMessage.includes('點數不足') || err.response?.status === 400) {
        await saveAndGoToWallet();
      } else {
        Alert.alert('發送失敗', errorMessage);
      }
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

        {/* 轉錄文字預覽（緊湊版） */}
        {transcript && (
          <View style={[styles.transcriptBanner, { backgroundColor: colors.muted.DEFAULT }]}>
            <Ionicons name="document-text-outline" size={14} color={colors.muted.foreground} />
            <Text style={[styles.transcriptBannerText, { color: colors.muted.foreground }]} numberOfLines={1}>
              {transcript}
            </Text>
            <Text style={[styles.transcriptBannerHint, { color: colors.muted.foreground }]}>
              預覽僅供參考
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

        {/* 提醒類型 */}
        <View style={styles.categorySection}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            提醒類型
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: selectedCategory === category.id
                      ? colors.primary.soft
                      : colors.card.DEFAULT,
                    borderColor: selectedCategory === category.id
                      ? colors.primary.DEFAULT
                      : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.iconBgColor }]}>
                  <Ionicons name={category.icon as any} size={16} color={category.iconColor} />
                </View>
                <Text
                  style={[
                    styles.categoryButtonText,
                    {
                      color: selectedCategory === category.id
                        ? colors.primary.DEFAULT
                        : colors.foreground,
                    },
                  ]}
                >
                  {category.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 位置選擇 */}
        <View style={[styles.fieldSection, styles.locationFieldSection]}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            事發地點 <Text style={{ color: colors.destructive.DEFAULT }}>*</Text>
          </Text>

          {/* 兩個按鈕：目前位置 + 地圖選擇 */}
          <View style={styles.locationButtonsRow}>
            <TouchableOpacity
              style={[styles.locationOptionButton, { backgroundColor: colors.muted.DEFAULT }]}
              onPress={handleGetCurrentLocation}
              disabled={isLoadingLocation}
              activeOpacity={0.7}
            >
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color={colors.foreground} />
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

          {/* 可編輯的地址輸入框 */}
          <AddressAutocomplete
            value={location}
            onChangeText={(text, lat, lng) => setLocationData(text, lat, lng)}
            placeholder="輸入或選擇地點..."
          />
        </View>

        <MapLocationPicker
          visible={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onConfirm={(locationData) => {
            setLocationData(locationData.address, locationData.latitude, locationData.longitude);
          }}
          initialLocation={
            latitude && longitude
              ? { address: location, latitude, longitude }
              : undefined
          }
        />

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
                    <View style={styles.buttonContentCenter}>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.sendButtonText}>立即送出語音提醒</Text>
                    </View>
                    <View style={styles.pointBadgeRight}>
                      <Text style={styles.pointBadgeRightText}>8 點</Text>
                    </View>
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
                    <View style={styles.buttonContentCenter}>
                      <Ionicons name="volume-high" size={20} color={colors.foreground} />
                      <Text style={[styles.insistButtonText, { color: colors.foreground }]}>
                        堅持使用語音送出
                      </Text>
                    </View>
                    <View style={[styles.pointBadgeRight, { backgroundColor: colors.muted.DEFAULT }]}>
                      <Text style={[styles.pointBadgeRightText, { color: colors.foreground }]}>8 點</Text>
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

  // Transcript (compact banner)
  transcriptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  transcriptBannerText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
  },
  transcriptBannerHint: {
    fontSize: typography.fontSize.xs,
    opacity: 0.7,
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

  // Category
  categorySection: {
    gap: spacing[2],
    marginHorizontal: -spacing[5], // Extend to edges for scroll
    paddingHorizontal: spacing[5],
  },
  categoryScrollContent: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[5],
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },

  // Location
  locationFieldSection: {
    zIndex: 1000,
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
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    position: 'relative',
  },
  buttonContentCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  sendButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  pointBadgeRight: {
    position: 'absolute',
    right: spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  pointBadgeRightText: {
    color: '#fff',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
  },
  insistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    position: 'relative',
  },
  insistButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
});
