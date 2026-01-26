/**
 * Send Navigator
 * 使用 Stack Navigation 實現原生滑動返回手勢
 *
 * V2 優化版流程（4 步驟）：
 * PlateInput → Category → MessageEdit → Confirm → Success
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SendStackParamList } from './types';
import { SendProvider } from '../context/SendContext';

// V2 Screens (優化版 4 步驟)
import PlateInputScreenV2 from '../screens/send/PlateInputScreenV2';
import CategoryScreenV2 from '../screens/send/CategoryScreenV2';
import MessageEditScreen from '../screens/send/MessageEditScreen';
import ConfirmScreenV2 from '../screens/send/ConfirmScreenV2';
import SuccessScreen from '../screens/send/SuccessScreen';

// V1 Screens (保留舊版相容性)
import VehicleTypeScreen from '../screens/send/VehicleTypeScreen';
import PlateInputScreen from '../screens/send/PlateInputScreen';
import CategoryScreen from '../screens/send/CategoryScreen';
import SituationScreen from '../screens/send/SituationScreen';
import ReviewScreen from '../screens/send/ReviewScreen';
import CustomScreen from '../screens/send/CustomScreen';
import AiSuggestScreen from '../screens/send/AiSuggestScreen';

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
      initialRouteName="PlateInput"
    >
      {/* V2 流程（優化版 4 步驟） */}
      <Stack.Screen name="PlateInput" component={PlateInputScreenV2} />
      <Stack.Screen name="Category" component={CategoryScreenV2} />
      <Stack.Screen name="MessageEdit" component={MessageEditScreen} />
      <Stack.Screen name="Confirm" component={ConfirmScreenV2} />
      <Stack.Screen
        name="Success"
        component={SuccessScreen}
        options={{
          gestureEnabled: false, // Disable swipe back on success screen
        }}
      />

      {/* V1 流程（保留舊版相容性） */}
      <Stack.Screen name="VehicleType" component={VehicleTypeScreen} />
      <Stack.Screen name="Situation" component={SituationScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
      <Stack.Screen name="Custom" component={CustomScreen} />
      <Stack.Screen name="AiSuggest" component={AiSuggestScreen} />
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
