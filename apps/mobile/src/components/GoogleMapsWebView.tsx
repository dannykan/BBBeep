/**
 * GoogleMapsWebView Component
 * Uses WebView with Google Maps JavaScript API to display Google Maps on iOS
 * This is a workaround for Google Maps SDK not working with React Native New Architecture
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface GoogleMapsWebViewProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  };
  marker?: Coordinate;
  onMapPress?: (coordinate: Coordinate) => void;
  onMarkerDragEnd?: (coordinate: Coordinate) => void;
  showsUserLocation?: boolean;
  style?: any;
}

export default function GoogleMapsWebView({
  initialRegion,
  marker,
  onMapPress,
  onMarkerDragEnd,
  showsUserLocation = false,
  style,
}: GoogleMapsWebViewProps) {
  const { isDark } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Update marker position when prop changes
  useEffect(() => {
    if (marker && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        updateMarker(${marker.latitude}, ${marker.longitude});
        true;
      `);
    }
  }, [marker?.latitude, marker?.longitude]);

  // Handle messages from WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'mapClick' && onMapPress) {
        onMapPress({ latitude: data.lat, longitude: data.lng });
      } else if (data.type === 'markerDragEnd' && onMarkerDragEnd) {
        onMarkerDragEnd({ latitude: data.lat, longitude: data.lng });
      } else if (data.type === 'mapReady') {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('WebView message error:', error);
    }
  }, [onMapPress, onMarkerDragEnd]);

  // Generate the HTML for the map
  const generateHTML = () => {
    const zoom = initialRegion.latitudeDelta ? Math.round(Math.log2(360 / initialRegion.latitudeDelta)) : 15;

    const darkModeStyles = isDark ? `
      { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
    ` : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; overflow: hidden; }
    #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map;
    let marker;
    let userLocationMarker;

    function initMap() {
      const center = { lat: ${initialRegion.latitude}, lng: ${initialRegion.longitude} };

      map = new google.maps.Map(document.getElementById('map'), {
        center: center,
        zoom: ${zoom},
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER
        },
        gestureHandling: 'greedy',
        ${isDark ? `styles: [${darkModeStyles}],` : ''}
      });

      // Add click listener
      map.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick', lat, lng }));
      });

      ${marker ? `
      // Add initial marker
      marker = new google.maps.Marker({
        position: { lat: ${marker.latitude}, lng: ${marker.longitude} },
        map: map,
        draggable: true,
      });

      marker.addListener('dragend', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerDragEnd', lat, lng }));
      });
      ` : ''}

      ${showsUserLocation ? `
      // Show user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
          userLocationMarker = new google.maps.Marker({
            position: userPos,
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
        });
      }
      ` : ''}

      // Notify React Native that map is ready
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    }

    // Function to update marker position from React Native
    function updateMarker(lat, lng) {
      const position = { lat, lng };
      if (marker) {
        marker.setPosition(position);
      } else {
        marker = new google.maps.Marker({
          position: position,
          map: map,
          draggable: true,
        });
        marker.addListener('dragend', (e) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'markerDragEnd',
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
          }));
        });
      }
      map.panTo(position);
    }

    // Function to animate to a location
    function animateToRegion(lat, lng, zoom) {
      map.panTo({ lat, lng });
      if (zoom) map.setZoom(zoom);
    }
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
</body>
</html>
    `;
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: generateHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled={showsUserLocation}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
