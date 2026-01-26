/**
 * Main Navigator
 * 主要功能頁面導航（Bottom Tabs）
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList } from './types';
import { useUnread } from '../context/UnreadContext';
import { useTheme, ThemeColors } from '../context/ThemeContext';

// Screens
import HomeScreen from '../screens/main/HomeScreen';
import SendNavigator from './SendNavigator';
import InboxNavigator from './InboxNavigator';
import WalletScreen from '../screens/settings/WalletScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

function InboxTabIcon({ focused, color, size }: { focused: boolean; color: string; size: number }) {
  const { unreadCount } = useUnread();
  const { colors } = useTheme();
  const iconName = focused ? 'mail' : 'mail-outline';
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.iconContainer}>
      <Ionicons name={iconName} size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function MainNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Send':
              iconName = focused ? 'send' : 'send-outline';
              break;
            case 'Inbox':
              // Handled by custom component
              return <InboxTabIcon focused={focused} color={color} size={size} />;
            case 'Wallet':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.muted.foreground,
        tabBarStyle: {
          backgroundColor: colors.card.DEFAULT,
          borderTopColor: colors.borderSolid,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: '首頁' }}
      />
      <Tab.Screen
        name="Send"
        component={SendNavigator}
        options={{ tabBarLabel: '發送提醒' }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxNavigator}
        options={{ tabBarLabel: '提醒訊息' }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ tabBarLabel: '點數' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: '設定' }}
      />
    </Tab.Navigator>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    iconContainer: {
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -10,
      backgroundColor: colors.destructive.DEFAULT,
      borderRadius: 10,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.destructive.foreground,
    },
  });
