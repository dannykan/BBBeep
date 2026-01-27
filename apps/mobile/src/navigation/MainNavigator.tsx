/**
 * Main Navigator
 * 主要功能頁面導航（Bottom Tabs）
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
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

function InboxTabIcon({ focused, size }: { focused: boolean; color: string; size: number }) {
  const { unreadCount } = useUnread();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.iconContainer}>
      <Image
        source={focused ? require('../../assets/inbox-icon.png') : require('../../assets/inbox-icon-inactive.png')}
        style={{ width: size + 12, height: size + 12 }}
      />
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
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 85,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
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
      backgroundColor: '#F59E0B',
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
      color: '#FFFFFF',
    },
  });
