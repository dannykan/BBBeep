/**
 * Location Display
 * 顯示地點資訊與小地圖 - 用於訊息詳情頁面
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';
import Constants from 'expo-constants';

interface LocationDisplayProps {
  location: string;
  latitude?: number;
  longitude?: number;
  showMiniMap?: boolean;
}

export default function LocationDisplay({
  location,
  latitude,
  longitude,
  showMiniMap = true,
}: LocationDisplayProps) {
  const { colors, isDark } = useTheme();
  const [mapReady, setMapReady] = useState(false);

  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  // Open location in Maps app
  const openInMaps = useCallback(() => {
    let url: string;

    if (hasCoordinates) {
      url = Platform.select({
        ios: `maps:0,0?q=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(location)})`,
      }) || `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    } else {
      const encodedLocation = encodeURIComponent(location);
      url = Platform.select({
        ios: `maps:0,0?q=${encodedLocation}`,
        android: `geo:0,0?q=${encodedLocation}`,
      }) || `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
    }

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        const webUrl = hasCoordinates
          ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
        Linking.openURL(webUrl);
      }
    }).catch(() => {
      Alert.alert('錯誤', '無法開啟地圖');
    });
  }, [location, latitude, longitude, hasCoordinates]);

  // Dark mode map style
  const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  ];

  const region: Region | undefined = hasCoordinates
    ? {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
      {/* Mini Map (if coordinates available) */}
      {showMiniMap && hasCoordinates && (
        <TouchableOpacity
          style={styles.mapContainer}
          onPress={openInMaps}
          activeOpacity={0.9}
        >
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            customMapStyle={isDark ? darkMapStyle : undefined}
            onMapReady={() => setMapReady(true)}
          >
            {mapReady && (
              <Marker
                coordinate={{ latitude, longitude }}
                pinColor={colors.primary.DEFAULT}
              />
            )}
          </MapView>
          {/* Map Overlay */}
          <View style={styles.mapOverlay}>
            <View style={[styles.tapHint, { backgroundColor: colors.card.DEFAULT }]}>
              <Ionicons name="expand-outline" size={14} color={colors.primary.DEFAULT} />
              <Text style={[styles.tapHintText, { color: colors.primary.DEFAULT }]}>
                點擊放大
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Location Info */}
      <TouchableOpacity
        style={styles.locationInfo}
        onPress={openInMaps}
        activeOpacity={0.7}
      >
        <View style={styles.locationRow}>
          <Ionicons name="location" size={18} color={colors.primary.DEFAULT} />
          <View style={styles.locationTextContainer}>
            <Text style={[styles.locationText, { color: colors.foreground }]} numberOfLines={2}>
              {location}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.primary.DEFAULT} />
        </View>
        <Text style={[styles.openHint, { color: colors.muted.foreground }]}>
          點擊在地圖中查看
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapContainer: {
    height: 150,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tapHintText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
  locationInfo: {
    padding: spacing[3],
    gap: spacing[1],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  locationTextContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  openHint: {
    fontSize: typography.fontSize.xs,
    marginLeft: spacing[6],
  },
});
