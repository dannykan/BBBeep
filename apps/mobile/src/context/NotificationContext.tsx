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

  // Register push token with backend (moved before requestPermissions so it can be called)
  const registerPushToken = useCallback(async () => {
    if (!Device.isDevice) {
      console.log('Not a physical device, skipping push token registration');
      return;
    }

    try {
      // Get push token (permission should already be granted at this point)
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

  // Request notification permissions (just-in-time pattern)
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) {
      Alert.alert('錯誤', '推播通知只能在真實裝置上使用');
      return false;
    }

    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      setPermissionStatus(existingStatus);
      // 直接註冊 token，不依賴 useEffect timing
      await registerPushToken();
      return true;
    }

    // Permission not granted
    if (canAskAgain) {
      // Can still ask, show system dialog
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      if (status === 'granted') {
        // 權限授予後直接註冊 token
        await registerPushToken();
      }
      return status === 'granted';
    } else {
      // Previously denied and can't ask again, guide to settings
      setPermissionStatus(existingStatus);
      showPermissionDeniedAlert();
      return false;
    }
  }, [showPermissionDeniedAlert, registerPushToken]);

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
      console.log('[Notification] Response received:', JSON.stringify(response.notification.request.content.data));

      const data = response.notification.request.content.data;

      try {
        if (data?.type === 'message' && data?.messageId) {
          console.log('[Notification] Navigating to message:', data.messageId);
          // Navigate to message detail
          navigation.navigate('Main', {
            screen: 'Inbox',
            params: {
              screen: 'MessageDetail',
              params: { messageId: data.messageId },
            },
          });
        } else if (data?.type === 'reply' && data?.messageId) {
          console.log('[Notification] Navigating to reply:', data.messageId);
          // Navigate to sent screen with the reply message
          navigation.navigate('Sent' as any, { selectedMessageId: data.messageId });
        } else {
          console.log('[Notification] Unknown notification type:', data?.type);
        }
      } catch (error) {
        console.error('[Notification] Navigation error:', error);
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

    // 檢查 App 是否從通知啟動（App 被殺掉後點擊通知的情況）
    const checkInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        console.log('App launched from notification:', response);
        // 延遲一下確保 navigation 已經準備好
        setTimeout(() => {
          handleNotificationResponse(response);
        }, 500);
      }
    };
    checkInitialNotification();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotification, handleNotificationResponse]);

  // Check permission status on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Register push token when authenticated, has completed onboarding, and permission is granted
  // This acts as a fallback for app restarts when the user already has permission
  useEffect(() => {
    if (isAuthenticated && user?.hasCompletedOnboarding && permissionStatus === 'granted' && !isRegistered) {
      registerPushToken();
    }
  }, [isAuthenticated, user?.hasCompletedOnboarding, permissionStatus, isRegistered, registerPushToken]);

  // Setup Android notification channel
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
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
