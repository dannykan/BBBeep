/**
 * Expo App Config
 * 動態配置，從環境變數讀取敏感資訊
 */

// Environment variables
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const LINE_CHANNEL_ID = process.env.EXPO_PUBLIC_LINE_CHANNEL_ID || '';
// Firebase config files (use EAS secret file path if available, otherwise local)
const GOOGLE_SERVICES_PLIST = process.env.GOOGLE_SERVICES_PLIST || './GoogleService-Info.plist';
const GOOGLE_SERVICES_JSON = process.env.GOOGLE_SERVICES_JSON || './google-services.json';

module.exports = {
  expo: {
    name: 'UBeep',
    slug: 'ubeep',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    scheme: 'ubeep',
    plugins: [
      [
        '@xmartlabs/react-native-line',
        {
          channelId: LINE_CHANNEL_ID,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: '此應用程式需要存取您的相簿以上傳行照照片',
        },
      ],
      [
        'expo-av',
        {
          microphonePermission: '此應用程式需要使用麥克風錄製語音訊息',
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#F6F6F4',
          image: './assets/splash-icon.png',
          imageWidth: 128,
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: '此應用程式需要存取您的位置以定位事發地點',
          locationWhenInUsePermission: '此應用程式需要存取您的位置以定位事發地點',
        },
      ],
      // react-native-maps - iOS uses Apple Maps due to New Architecture incompatibility
      // Google Maps works on Android only
      [
        'react-native-maps',
        {
          androidGoogleMapsApiKey: GOOGLE_MAPS_API_KEY,
        },
      ],
      'expo-font',
      // Firebase - requires expo-build-properties for native config
      '@react-native-firebase/app',
      // Custom plugin to fix Firebase/GoogleUtilities Swift module compatibility
      './plugins/withModularHeaders',
    ],
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F6F6F4',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.ubeep.mobile',
      usesAppleSignIn: true,
      googleServicesFile: GOOGLE_SERVICES_PLIST,
      infoPlist: {
        NSPhotoLibraryUsageDescription: '需要存取您的相簿以上傳行照照片',
        NSCameraUsageDescription: '需要使用相機拍攝行照照片',
        NSMicrophoneUsageDescription: '需要使用麥克風錄製語音訊息',
        NSLocationWhenInUseUsageDescription: '需要存取您的位置以定位事發地點',
        ITSAppUsesNonExemptEncryption: false,
      },
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      package: 'com.ubeep.mobile',
      googleServicesFile: GOOGLE_SERVICES_JSON,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1E3A5F',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: 'bfb94786-6db3-42d3-a5c2-d2b2ba612e48',
      },
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
    owner: 'team-ubeep',
  },
};
