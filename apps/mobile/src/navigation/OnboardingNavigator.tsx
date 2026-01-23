/**
 * Onboarding Navigator
 * 使用 Stack Navigation 實現原生滑動返回手勢
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import { OnboardingProvider } from '../context/OnboardingContext';

// Screens
import UserTypeScreen from '../screens/onboarding/UserTypeScreen';
import LicensePlateScreen from '../screens/onboarding/LicensePlateScreen';
import NicknameScreen from '../screens/onboarding/NicknameScreen';
import PointsExplanationScreen from '../screens/onboarding/PointsExplanationScreen';
import InviteCodeScreen from '../screens/onboarding/InviteCodeScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // Enable native swipe-back gesture
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
      initialRouteName="UserType"
    >
      <Stack.Screen name="UserType" component={UserTypeScreen} />
      <Stack.Screen name="LicensePlate" component={LicensePlateScreen} />
      <Stack.Screen name="Nickname" component={NicknameScreen} />
      <Stack.Screen name="PointsExplanation" component={PointsExplanationScreen} />
      <Stack.Screen name="InviteCode" component={InviteCodeScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
    </Stack.Navigator>
  );
}

export default function OnboardingNavigator() {
  return (
    <OnboardingProvider>
      <OnboardingStack />
    </OnboardingProvider>
  );
}
