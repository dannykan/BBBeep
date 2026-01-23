/**
 * Send Navigator
 * 使用 Stack Navigation 實現原生滑動返回手勢
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SendStackParamList } from './types';
import { SendProvider } from '../context/SendContext';

// Screens
import VehicleTypeScreen from '../screens/send/VehicleTypeScreen';
import PlateInputScreen from '../screens/send/PlateInputScreen';
import CategoryScreen from '../screens/send/CategoryScreen';
import SituationScreen from '../screens/send/SituationScreen';
import ReviewScreen from '../screens/send/ReviewScreen';
import CustomScreen from '../screens/send/CustomScreen';
import AiSuggestScreen from '../screens/send/AiSuggestScreen';
import ConfirmScreen from '../screens/send/ConfirmScreen';
import SuccessScreen from '../screens/send/SuccessScreen';

const Stack = createNativeStackNavigator<SendStackParamList>();

function SendStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // Enable native swipe-back gesture
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
      initialRouteName="VehicleType"
    >
      <Stack.Screen name="VehicleType" component={VehicleTypeScreen} />
      <Stack.Screen name="PlateInput" component={PlateInputScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="Situation" component={SituationScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
      <Stack.Screen name="Custom" component={CustomScreen} />
      <Stack.Screen name="AiSuggest" component={AiSuggestScreen} />
      <Stack.Screen name="Confirm" component={ConfirmScreen} />
      <Stack.Screen
        name="Success"
        component={SuccessScreen}
        options={{
          gestureEnabled: false, // Disable swipe back on success screen
        }}
      />
    </Stack.Navigator>
  );
}

export default function SendNavigator() {
  return (
    <SendProvider>
      <SendStack />
    </SendProvider>
  );
}
