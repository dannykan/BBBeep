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
import { VoiceMessagePlayer } from '../../components/VoiceMessagePlayer';
import { analytics } from '../../lib/analytics';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickVoiceSend'>;

type ReminderCategory = '車況提醒' | '行車安全' | '讚美感謝' | '其他情況';

interface CategoryOption {
  id: ReminderCategory;
  title: string;
  icon: string;
  iconColor: string;
  iconBgColor: string;
  apiType: '車況提醒' | '行車安全提醒' | '讚美感謝';
}

export default function QuickVoiceSendScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const { user, refreshUser } = useAuth();

  // 進入頁面時刷新用戶資料（確保點數是最新的）
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // 從 route params 取得語音資料
  const {
    voiceUri,
    voiceDuration,
    transcript,
    recordedAt,
    latitude: initialLat,
    longitude: initialLng,
    address: initialAddress,
    // 從草稿進入時帶入的資料
    draftId,
    selectedPlate: initialPlate,
    vehicleType: initialVehicleType,
  } = route.params;

  // Form state - 從草稿帶入初始值
  const [licensePlate, setLicensePlateState] = useState(initialPlate || '');
  const [vehicleType, setVehicleTypeState] = useState<'car' | 'scooter'>(initialVehicleType || 'car');
  const [selectedCategory, setSelectedCategory] = useState<ReminderCategory>('車況提醒');

  // 包裝 setter 來追蹤編輯狀態
  const setLicensePlate = (value: string) => {
    setLicensePlateState(value);
    if (isFromDraft) setHasEdits(true);
  };
  const setVehicleType = (value: 'car' | 'scooter') => {
    setVehicleTypeState(value);
    if (isFromDraft) setHasEdits(true);
  };

  // Category options - apiType 必須使用後端 DTO 接受的中文值
  const categories: CategoryOption[] = [
    {
      id: '車況提醒',
      title: '車況提醒',
      icon: 'alert-circle-outline',
      iconColor: '#F59E0B',
      iconBgColor: '#FEF3C7',
      apiType: '車況提醒',
    },
    {
      id: '行車安全',
      title: '行車安全',
      icon: 'shield-checkmark-outline',
      iconColor: '#3B82F6',
      iconBgColor: '#DBEAFE',
      apiType: '行車安全提醒',
    },
    {
      id: '讚美感謝',
      title: '讚美感謝',
      icon: 'heart',
      iconColor: '#22C55E',
      iconBgColor: '#DCFCE7',
      apiType: '讚美感謝',
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


  // AI moderation state
  const [isModeratingVoice, setIsModeratingVoice] = useState(false);
  const [voiceModeration, setVoiceModeration] = useState<{
    isAppropriate: boolean;
    category: string;
    reason?: string;
  } | null>(null);

  // Upload state
  // 如果從草稿進入，voiceUri 已經是 R2 URL，不需要重新上傳
  const isFromDraft = !!draftId;
  const [uploadedVoiceUrl, setUploadedVoiceUrl] = useState<string | null>(
    isFromDraft ? voiceUri : null
  );
  const [isUploading, setIsUploading] = useState(false);

  // Send state
  const [isSending, setIsSending] = useState(false);

  // Draft state - 追蹤草稿是否已儲存，避免重複儲存
  // 如果從草稿進入（有 draftId），表示草稿已存在
  const [draftSaved, setDraftSaved] = useState(!!draftId);

  // 追蹤是否有編輯過（用於從草稿進入時判斷是否需要更新）
  const [hasEdits, setHasEdits] = useState(false);

  // Refs for functions used in beforeRemove (to avoid stale closures)
  const updateDraftRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));
  const saveDraftRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));

  // 格式化錄製時間
  const formatRecordedTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day} ${hours}:${minutes}`;
  };


  // 初始化：取得位置和上傳語音
  useEffect(() => {
    getLocationOnInit();
    // 從草稿進入時不需要重新上傳語音
    if (!isFromDraft) {
      uploadVoice();
    }
    moderateVoiceContent();
  }, []);

  // 攔截返回手勢和硬體返回鍵
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // 正在發送中，允許直接返回
      if (isSending) {
        return;
      }

      // 如果語音還在上傳中或還沒上傳完成
      if (isUploading || !uploadedVoiceUrl) {
        e.preventDefault();
        Alert.alert(
          '確認離開',
          '語音正在上傳中，離開將會遺失錄音。確定要離開嗎？',
          [
            { text: '取消', style: 'cancel' },
            { text: '離開', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          ]
        );
        return;
      }

      // 從草稿進入且有編輯過 → 詢問是否更新草稿
      if (isFromDraft && hasEdits) {
        e.preventDefault();
        Alert.alert(
          '更新草稿？',
          '是否將編輯的內容儲存到草稿？',
          [
            {
              text: '不儲存',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
            {
              text: '更新草稿',
              onPress: async () => {
                const updated = await updateDraftRef.current();
                if (updated) {
                  Alert.alert('已更新', '草稿已更新', [
                    { text: '確定', onPress: () => navigation.dispatch(e.data.action) },
                  ]);
                } else {
                  Alert.alert('更新失敗', '無法更新草稿', [
                    { text: '確定', onPress: () => navigation.dispatch(e.data.action) },
                  ]);
                }
              },
            },
          ]
        );
        return;
      }

      // 從草稿進入但沒有編輯 → 直接返回
      if (isFromDraft) {
        return;
      }

      // 新錄音且已經儲存過草稿 → 直接返回
      if (draftSaved) {
        return;
      }

      // 新錄音且尚未儲存 → 詢問是否儲存草稿
      e.preventDefault();
      Alert.alert(
        '儲存草稿？',
        '是否將語音錄音儲存為草稿？稍後可從首頁繼續編輯。',
        [
          {
            text: '不儲存',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: '儲存草稿',
            onPress: async () => {
              const saved = await saveDraftRef.current();
              if (saved) {
                Alert.alert('已儲存', '語音已儲存至草稿', [
                  { text: '確定', onPress: () => navigation.dispatch(e.data.action) },
                ]);
              } else {
                Alert.alert('儲存失敗', '無法儲存草稿', [
                  { text: '確定', onPress: () => navigation.dispatch(e.data.action) },
                ]);
              }
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isSending, isUploading, uploadedVoiceUrl, isFromDraft, hasEdits]);

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
      const result = await aiApi.moderate(transcript);
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


  // 前往設定開啟位置權限
  const openSettings = async () => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  };

  // 更新現有草稿
  const updateDraft = async (): Promise<boolean> => {
    if (!draftId) return false;

    try {
      await draftsApi.update(draftId, {
        selectedPlate: licensePlate || undefined,
        vehicleType: vehicleType,
      });
      setHasEdits(false);
      return true;
    } catch (err) {
      console.error('Update draft error:', err);
      return false;
    }
  };

  // 儲存新草稿的共用函數
  const saveDraft = async (): Promise<boolean> => {
    // 如果已經儲存過（且不是從草稿來的），不重複儲存
    if (draftSaved && !isFromDraft) {
      return true;
    }

    // 如果語音還沒上傳完成，無法儲存
    if (!uploadedVoiceUrl) {
      return false;
    }

    try {
      await draftsApi.create({
        voiceUrl: uploadedVoiceUrl,
        voiceDuration: voiceDuration,
        transcript: transcript,
        selectedPlate: licensePlate || undefined,
        vehicleType: vehicleType,
        occurredAt: recordedAt,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: location || undefined,
      });
      setDraftSaved(true);
      return true;
    } catch (err) {
      console.error('Save draft error:', err);
      return false;
    }
  };

  // 更新 refs（讓 beforeRemove callback 能存取最新的函數）
  useEffect(() => {
    updateDraftRef.current = updateDraft;
    saveDraftRef.current = saveDraft;
  });

  // 儲存草稿並導航到錢包
  const saveAndGoToWallet = async () => {
    const saved = await saveDraft();

    if (saved) {
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
    } else {
      Alert.alert('儲存失敗', '無法儲存草稿，請稍後再試');
    }
  };

  // 返回按鈕處理 - 詢問是否儲存草稿
  const handleBackPress = () => {
    // 如果語音還在上傳中，無法儲存
    if (isUploading || !uploadedVoiceUrl) {
      Alert.alert(
        '確認離開',
        '語音正在上傳中，離開將會遺失錄音。確定要離開嗎？',
        [
          { text: '取消', style: 'cancel' },
          { text: '離開', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
      return;
    }

    // 從草稿進入且有編輯過 → 詢問是否更新草稿
    if (isFromDraft && hasEdits) {
      Alert.alert(
        '更新草稿？',
        '是否將編輯的內容儲存到草稿？',
        [
          {
            text: '不儲存',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
          {
            text: '更新草稿',
            onPress: async () => {
              const updated = await updateDraft();
              if (updated) {
                Alert.alert('已更新', '草稿已更新', [
                  { text: '確定', onPress: () => navigation.goBack() },
                ]);
              } else {
                Alert.alert('更新失敗', '無法更新草稿', [
                  { text: '確定', onPress: () => navigation.goBack() },
                ]);
              }
            },
          },
        ]
      );
      return;
    }

    // 從草稿進入但沒有編輯 → 直接返回
    if (isFromDraft) {
      navigation.goBack();
      return;
    }

    // 新錄音且已經儲存過草稿 → 直接返回
    if (draftSaved) {
      navigation.goBack();
      return;
    }

    // 新錄音且尚未儲存 → 詢問是否儲存草稿
    Alert.alert(
      '儲存草稿？',
      '是否將語音錄音儲存為草稿？稍後可從首頁繼續編輯。',
      [
        {
          text: '不儲存',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
        {
          text: '儲存草稿',
          onPress: async () => {
            const saved = await saveDraft();
            if (saved) {
              Alert.alert('已儲存', '語音已儲存至草稿', [
                { text: '確定', onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert('儲存失敗', '無法儲存草稿', [
                { text: '確定', onPress: () => navigation.goBack() },
              ]);
            }
          },
        },
      ]
    );
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
      // 取得選中類別的 API 類型（使用中文值）
      const categoryApiType = categories.find(c => c.id === selectedCategory)?.apiType || '車況提醒';

      await messagesApi.create({
        licensePlate: normalizedPlate,
        type: categoryApiType,
        template: transcript || '語音訊息',
        voiceUrl: uploadedVoiceUrl,
        voiceDuration: voiceDuration,
        location: location,
        occurredAt: recordedAt,
      });

      // Analytics 追踪发送成功
      analytics.trackSendMessage({
        messageType: categoryApiType,
        sendMode: 'voice',
        pointCost: 8,
        category: selectedCategory,
      });

      // 成功後導航到成功頁面或返回首頁
      navigation.replace('Main');
      Alert.alert('發送成功', '語音提醒已成功送出');
    } catch (err: any) {
      // 嘗試從多個位置取得錯誤訊息
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        '請稍後再試';

      // 只有真正的點數不足錯誤才儲存草稿並導向儲值
      if (errorMessage.includes('點數不足')) {
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
          onPress={handleBackPress}
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
        {/* 語音播放器 - 使用統一組件 */}
        <VoiceMessagePlayer
          voiceUrl={voiceUri}
          duration={voiceDuration}
          showLabel={true}
          label="語音訊息"
        />

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
