/**
 * Root Navigator
 * 根據認證狀態顯示不同的導航
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import type { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import WalletScreen from '../screens/settings/WalletScreen';
import SentScreen from '../screens/settings/SentScreen';
import InviteFriendsScreen from '../screens/settings/InviteFriendsScreen';
import BlockListScreen from '../screens/settings/BlockListScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import LicensePlateChangeScreen from '../screens/settings/LicensePlateChangeScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import AppearanceScreen from '../screens/settings/AppearanceScreen';
import LegalScreen from '../screens/settings/LegalScreen';
import QuickRecordScreen from '../screens/send/QuickRecordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isLoading, isAuthenticated, user } = useAuth();

  // 載入中
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A6FA5" />
      </View>
    );
  }

  // 判斷是否需要 Onboarding
  const needsOnboarding = isAuthenticated && user && !user.hasCompletedOnboarding;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : needsOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Sent" component={SentScreen} />
          <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} />
          <Stack.Screen name="BlockList" component={BlockListScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="LicensePlateChange" component={LicensePlateChangeScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <Stack.Screen name="Appearance" component={AppearanceScreen} />
          <Stack.Screen name="Legal" component={LegalScreen} />
          <Stack.Screen
            name="QuickRecord"
            component={QuickRecordScreen}
            options={{
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
