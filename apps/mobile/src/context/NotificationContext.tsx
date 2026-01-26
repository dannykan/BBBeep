/**
 * Notification Context
 * 推播通知管理
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { notificationsApi } from '@bbbeeep/shared';
import { useAuth } from './AuthContext';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  permissionStatus: Notifications.PermissionStatus | null;
  requestPermissions: () => Promise<boolean>;
  isRegistered: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  permissionStatus: null,
  requestPermissions: async () => false,
  isRegistered: false,
});

export function useNotifications() {
  return useContext(NotificationContext);
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated, user } = useAuth();
  const navigation = useNavigation<any>();

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Get permission status
  const checkPermissions = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
    return status;
  }, []);

  // Show alert when permission was previously denied
  const showPermissionDeniedAlert = useCallback(() => {
    Alert.alert(
      '需要通知權限',
      '您之前拒絕了通知權限。\n\n請前往「設定」→「UBeep」→ 開啟「通知」權限，才能收到重要提醒。',
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

  // Request notification permissions (just-in-time pattern)
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) {
      Alert.alert('錯誤', '推播通知只能在真實裝置上使用');
      return false;
    }

    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      setPermissionStatus(existingStatus);
      return true;
    }

    // Permission not granted
    if (canAskAgain) {
      // Can still ask, show system dialog
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      return status === 'granted';
    } else {
      // Previously denied and can't ask again, guide to settings
      setPermissionStatus(existingStatus);
      showPermissionDeniedAlert();
      return false;
    }
  }, [showPermissionDeniedAlert]);

  // Register push token with backend
  const registerPushToken = useCallback(async () => {
    if (!Device.isDevice) {
      console.log('Not a physical device, skipping push token registration');
      return;
    }

    try {
      // Check permission first
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      // Get push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      console.log('Expo Push Token:', token.data);
      setExpoPushToken(token.data);

      // Register with backend
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await notificationsApi.registerDevice({
        token: token.data,
        platform,
      });

      setIsRegistered(true);
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }, []);

  // Handle notification received while app is foregrounded
  const handleNotification = useCallback(
    (notification: Notifications.Notification) => {
      console.log('Notification received:', notification);
      // The notification will be shown automatically by the handler
    },
    []
  );

  // Handle notification response (user tapped on notification)
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      console.log('Notification response:', response);

      const data = response.notification.request.content.data;

      if (data?.type === 'message' && data?.messageId) {
        // Navigate to message detail
        navigation.navigate('Main', {
          screen: 'Inbox',
          params: {
            screen: 'MessageDetail',
            params: { messageId: data.messageId },
          },
        });
      }
    },
    [navigation]
  );

  // Setup notification listeners
  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener(handleNotification);

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [handleNotification, handleNotificationResponse]);

  // Check permission status on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Register push token when authenticated and has completed onboarding
  useEffect(() => {
    if (isAuthenticated && user?.hasCompletedOnboarding) {
      registerPushToken();
    }
  }, [isAuthenticated, user?.hasCompletedOnboarding, registerPushToken]);

  // Setup Android notification channel
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4A6FA5',
      });
    }
  }, []);

  const value: NotificationContextType = {
    expoPushToken,
    permissionStatus,
    requestPermissions,
    isRegistered,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
