/**
 * Map Location Picker
 * 地圖地點選擇器 - 用於發送提醒時選擇事發地點
 * 支援地址自動完成、地圖選點、目前位置
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
  ScrollView,
  Keyboard,
} from 'react-native';
// Platform is already imported above
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default location: Taipei
const DEFAULT_REGION: Region = {
  latitude: 25.033,
  longitude: 121.5654,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Debounce delay for autocomplete
const AUTOCOMPLETE_DEBOUNCE = 400;

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface AddressSuggestion {
  address: string;
  mainText: string;
  latitude: number;
  longitude: number;
}

interface MapLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: LocationData) => void;
  initialLocation?: LocationData;
}

// Simplify Taiwan address
function simplifyAddress(address: string): string {
  return address
    .replace(/,\s*台灣$/, '')
    .replace(/台灣/g, '')
    .replace(/\d{3,6}/g, '') // Remove postal codes
    .replace(/^\s*,\s*/, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*$/, '')
    .trim();
}

// Extract main text from address (route name or landmark)
function extractMainText(addressComponents: any[], formattedAddress: string): string {
  // Try to get route (street name)
  const route = addressComponents.find((c: any) => c.types.includes('route'));
  if (route) return route.long_name;

  // Try to get point of interest
  const poi = addressComponents.find((c: any) => c.types.includes('point_of_interest'));
  if (poi) return poi.long_name;

  // Try to get neighborhood
  const neighborhood = addressComponents.find((c: any) => c.types.includes('neighborhood'));
  if (neighborhood) return neighborhood.long_name;

  // Fallback to first part of address
  const simplified = simplifyAddress(formattedAddress);
  const parts = simplified.split(/[,，]/);
  return parts[0] || simplified;
}

export default function MapLocationPicker({
  visible,
  onClose,
  onConfirm,
  initialLocation,
}: MapLocationPickerProps) {
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSuggestions([]);
      setShowSuggestions(false);

      if (initialLocation) {
        setSelectedLocation(initialLocation);
        setRegion({
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        setSelectedLocation(null);
      }
    }
  }, [visible, initialLocation]);

  // 自動取得目前位置（第一次開啟且沒有初始位置時）
  useEffect(() => {
    if (visible && !initialLocation && !selectedLocation && !isLoadingLocation) {
      handleGetCurrentLocation();
    }
  }, [visible]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Fetch address suggestions (debounced)
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2 || !googleMapsApiKey) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleMapsApiKey}&language=zh-TW&components=country:TW&region=tw`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Filter and deduplicate results
        const seen = new Set<string>();
        const newSuggestions: AddressSuggestion[] = [];

        for (const result of data.results) {
          const address = simplifyAddress(result.formatted_address);
          if (seen.has(address)) continue;
          seen.add(address);

          const mainText = extractMainText(result.address_components, result.formatted_address);
          const { lat, lng } = result.geometry.location;

          newSuggestions.push({
            address,
            mainText,
            latitude: lat,
            longitude: lng,
          });

          if (newSuggestions.length >= 5) break; // Limit to 5 suggestions
        }

        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Fetch suggestions error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [googleMapsApiKey]);

  // Handle search query change with debounce
  const handleSearchQueryChange = useCallback((text: string) => {
    setSearchQuery(text);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the search
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, AUTOCOMPLETE_DEBOUNCE);
  }, [fetchSuggestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: AddressSuggestion) => {
    Keyboard.dismiss();
    setSearchQuery(suggestion.mainText);
    setSuggestions([]);
    setShowSuggestions(false);

    // Animate to location
    mapRef.current?.animateToRegion({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 500);

    setSelectedLocation({
      address: suggestion.address,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

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

  // Handle map press
  const handleMapPress = useCallback(async (event: any) => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    const { latitude, longitude } = event.nativeEvent.coordinate;

    setIsLoadingAddress(true);
    const address = await reverseGeocode(latitude, longitude);
    setSelectedLocation({ address, latitude, longitude });
    setIsLoadingAddress(false);
  }, [reverseGeocode]);

  // Handle marker drag end
  const handleMarkerDragEnd = useCallback(async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    setIsLoadingAddress(true);
    const address = await reverseGeocode(latitude, longitude);
    setSelectedLocation({ address, latitude, longitude });
    setIsLoadingAddress(false);
  }, [reverseGeocode]);

  // Show alert when location permission was previously denied
  const showLocationPermissionDeniedAlert = useCallback(() => {
    Alert.alert(
      '需要位置權限',
      '您之前拒絕了位置權限。\n\n請前往「設定」→「UBeep」→ 開啟「位置」權限，才能使用定位功能。',
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
  }, []);

  // Get current location (just-in-time permission pattern)
  const handleGetCurrentLocation = useCallback(async () => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setIsLoadingLocation(true);

    try {
      // Check current permission status first
      const { status: existingStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();

      if (existingStatus !== 'granted') {
        if (canAskAgain) {
          // Can still ask, show system dialog
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setIsLoadingLocation(false);
            return;
          }
        } else {
          // Previously denied and can't ask again, guide to settings
          showLocationPermissionDeniedAlert();
          setIsLoadingLocation(false);
          return;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Animate to location
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);

      // Get address
      const address = await reverseGeocode(latitude, longitude);
      setSelectedLocation({ address, latitude, longitude });
    } catch (error) {
      console.error('Get location error:', error);
      Alert.alert('錯誤', '無法取得目前位置');
    } finally {
      setIsLoadingLocation(false);
    }
  }, [reverseGeocode, showLocationPermissionDeniedAlert]);

  // Search address (manual search button)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !googleMapsApiKey) return;

    Keyboard.dismiss();
    setShowSuggestions(false);
    setIsSearching(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${googleMapsApiKey}&language=zh-TW&components=country:TW&region=tw`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        const address = simplifyAddress(data.results[0].formatted_address);

        // Animate to location
        mapRef.current?.animateToRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);

        setSelectedLocation({ address, latitude: lat, longitude: lng });
      } else {
        Alert.alert('找不到地址', '請嘗試不同的搜尋關鍵字');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('搜尋失敗', '請稍後再試');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, googleMapsApiKey]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (selectedLocation) {
      onConfirm(selectedLocation);
      onClose();
    }
  }, [selectedLocation, onConfirm, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card.DEFAULT, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Text style={[styles.headerButtonText, { color: colors.muted.foreground }]}>取消</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>選擇事發地點</Text>
          <View style={styles.headerButton} />
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Search Bar with Autocomplete */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card.DEFAULT }]}>
            <View style={styles.searchRow}>
              <View style={[styles.searchInputWrapper, { backgroundColor: colors.input.background, borderColor: colors.input.border }]}>
                <Ionicons name="search" size={18} color={colors.muted.foreground} style={styles.searchIcon} />
                <TextInput
                  ref={inputRef}
                  style={[styles.searchInput, { color: colors.foreground }]}
                  value={searchQuery}
                  onChangeText={handleSearchQueryChange}
                  placeholder="搜尋地址或地標..."
                  placeholderTextColor={colors.input.placeholder}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                />
                {isLoadingSuggestions && (
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} style={styles.searchLoading} />
                )}
                {searchQuery.length > 0 && !isLoadingSuggestions && (
                  <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color={colors.muted.foreground} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: `${colors.primary.DEFAULT}15` }]}
                onPress={handleGetCurrentLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                ) : (
                  <Ionicons name="navigate" size={20} color={colors.primary.DEFAULT} />
                )}
              </TouchableOpacity>
            </View>

            {/* Autocomplete Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <View style={[styles.suggestionsContainer, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  style={styles.suggestionsList}
                >
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                      style={[
                        styles.suggestionItem,
                        index < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                      onPress={() => handleSelectSuggestion(suggestion)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.suggestionIcon, { backgroundColor: `${colors.primary.DEFAULT}15` }]}>
                        <Ionicons name="location" size={16} color={colors.primary.DEFAULT} />
                      </View>
                      <View style={styles.suggestionTextContainer}>
                        <Text style={[styles.suggestionMainText, { color: colors.foreground }]} numberOfLines={1}>
                          {suggestion.mainText}
                        </Text>
                        <Text style={[styles.suggestionSubText, { color: colors.muted.foreground }]} numberOfLines={1}>
                          {suggestion.address}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={region}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {selectedLocation && (
                <Marker
                  coordinate={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                />
              )}
            </MapView>

            {/* Map Overlay Hint */}
            {!selectedLocation && (
              <View style={styles.mapHint}>
                <View style={[styles.mapHintBox, { backgroundColor: colors.card.DEFAULT }]}>
                  <Text style={[styles.mapHintText, { color: colors.muted.foreground }]}>
                    點擊地圖選擇位置
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Selected Location */}
          <View style={[styles.footer, { backgroundColor: colors.card.DEFAULT, borderTopColor: colors.border }]}>
            {selectedLocation ? (
              <View style={styles.selectedLocationContainer}>
                {/* 地址顯示 */}
                <View style={styles.addressSection}>
                  <View style={[styles.addressIconContainer, { backgroundColor: `${colors.primary.DEFAULT}15` }]}>
                    <Ionicons name="location" size={18} color={colors.primary.DEFAULT} />
                  </View>

                  {isLoadingAddress ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                      <Text style={[styles.loadingText, { color: colors.muted.foreground }]}>
                        取得地址中...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.addressDisplay}>
                      <Text style={[styles.addressText, { color: colors.foreground }]} numberOfLines={2}>
                        {selectedLocation.address}
                      </Text>
                      <Text style={[styles.dragHint, { color: colors.muted.foreground }]}>
                        可拖曳標記調整位置
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.noLocation}>
                <View style={[styles.noLocationIcon, { backgroundColor: colors.muted.DEFAULT }]}>
                  <Ionicons name="location-outline" size={24} color={colors.muted.foreground} />
                </View>
                <View style={styles.noLocationTextContainer}>
                  <Text style={[styles.noLocationTitle, { color: colors.foreground }]}>
                    尚未選擇位置
                  </Text>
                  <Text style={[styles.noLocationHint, { color: colors.muted.foreground }]}>
                    搜尋地址、點擊地圖或使用定位
                  </Text>
                </View>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.muted.DEFAULT }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: colors.primary.DEFAULT },
                  (!selectedLocation || isLoadingAddress) && styles.buttonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!selectedLocation || isLoadingAddress}
              >
                <Ionicons name="checkmark" size={18} color={colors.primary.foreground} />
                <Text style={[styles.confirmButtonText, { color: colors.primary.foreground }]}>
                  確認地點
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  headerButton: {
    width: 60,
  },
  headerButtonText: {
    fontSize: typography.fontSize.base,
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: spacing[3],
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    height: 44,
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    height: '100%',
  },
  searchLoading: {
    marginLeft: spacing[2],
  },
  clearButton: {
    padding: spacing[1],
    marginLeft: spacing[1],
  },
  locationButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 44 + spacing[3] + spacing[3],
    left: spacing[3],
    right: spacing[3] + 44 + spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 240,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 240,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    gap: spacing[3],
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextContainer: {
    flex: 1,
    gap: spacing[0.5],
  },
  suggestionMainText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  suggestionSubText: {
    fontSize: typography.fontSize.xs,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapHint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  mapHintBox: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHintText: {
    fontSize: typography.fontSize.sm,
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    gap: spacing[4],
  },
  selectedLocationContainer: {
    gap: spacing[3],
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  addressIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
  },
  addressDisplay: {
    flex: 1,
    gap: spacing[1],
  },
  addressText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  dragHint: {
    fontSize: typography.fontSize.xs,
  },
  noLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  noLocationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noLocationTextContainer: {
    flex: 1,
    gap: spacing[0.5],
  },
  noLocationTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  noLocationHint: {
    fontSize: typography.fontSize.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  cancelButton: {
    flex: 0.4,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  confirmButton: {
    flex: 0.6,
    flexDirection: 'row',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
  },
  confirmButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
