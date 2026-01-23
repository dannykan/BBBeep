/**
 * Inbox Navigator
 * 提醒訊息導航（支援原生滑動返回手勢）
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { InboxStackParamList } from './types';

import InboxListScreen from '../screens/main/InboxListScreen';
import MessageDetailScreen from '../screens/main/MessageDetailScreen';

const Stack = createNativeStackNavigator<InboxStackParamList>();

export default function InboxNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="InboxScreen" component={InboxListScreen} />
      <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
    </Stack.Navigator>
  );
}
