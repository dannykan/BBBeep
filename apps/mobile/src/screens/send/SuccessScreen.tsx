/**
 * Success Screen
 * 發送成功 - 優化版
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useSend } from '../../context/SendContext';
import { useTheme } from '../../context/ThemeContext';
import { SendLayout } from './components';
import { displayLicensePlate } from '@bbbeeep/shared';
import { typography, spacing, borderRadius } from '../../theme';

export default function SuccessScreen() {
  const navigation = useNavigation<any>();
  const { targetPlate, resetSend } = useSend();
  const { colors, isDark } = useTheme();

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Success icon bounce animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 3,
      useNativeDriver: true,
    }).start();

    // Content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleGoHome = () => {
    navigation.getParent()?.navigate('Home');
  };

  const handleSendAnother = () => {
    resetSend();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'VehicleType' }],
      })
    );
  };

  const handleShare = async () => {
    try {
      const appStoreUrl = Platform.select({
        ios: 'https://apps.apple.com/app/ubeep/id6758199946',
        android: 'https://play.google.com/store/apps/details?id=com.ubeep.mobile',
      });

      await Share.share({
        message: `我正在用 UBeep 提醒路上的駕駛朋友！一起來使用，讓大家都能即時收到善意提醒 ${appStoreUrl}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  // Colors - warm heart theme
  const heartIconBgColor = isDark ? '#831843' : '#FCE7F3';
  const heartIconColor = isDark ? '#F9A8D4' : '#EC4899';
  const notificationBgColor = isDark ? 'rgba(74, 111, 165, 0.15)' : 'rgba(74, 111, 165, 0.08)';
  const shareBgColor = isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)';

  return (
    <SendLayout
      currentStep={5}
      totalSteps={5}
      title="送出成功"
      showBackButton={false}
      showProgress={false}
      showVoiceMemo={false}
    >
      <View style={styles.content}>
        {/* Heart icon with animation */}
        <Animated.View
          style={[
            styles.successIcon,
            { backgroundColor: heartIconBgColor },
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Ionicons name="heart" size={44} color={heartIconColor} />
        </Animated.View>

        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          {/* Appreciation message */}
          <Text style={[styles.title, { color: colors.foreground }]}>感謝你的善意</Text>
          <Text style={[styles.subtitle, { color: colors.muted.foreground }]}>
            已送出提醒給 {displayLicensePlate(targetPlate)}{'\n'}
            謝謝你為道路安全盡一份心力
          </Text>

          {/* Notification info card */}
          <View style={[styles.infoCard, { backgroundColor: notificationBgColor }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconCircle, { backgroundColor: colors.primary.DEFAULT + '20' }]}>
                <Ionicons name="notifications" size={18} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoTitle, { color: colors.foreground }]}>即時推播通知</Text>
                <Text style={[styles.infoDescription, { color: colors.muted.foreground }]}>
                  若對方已安裝 UBeep，將立即收到通知
                </Text>
              </View>
            </View>
          </View>

          {/* Share promotion card */}
          <View style={[styles.shareCard, { backgroundColor: shareBgColor }]}>
            <View style={styles.shareHeader}>
              <View style={[styles.shareIconCircle, { backgroundColor: '#FCD34D30' }]}>
                <Ionicons name="people" size={20} color="#F59E0B" />
              </View>
              <View style={styles.shareTextContainer}>
                <Text style={[styles.shareTitle, { color: colors.foreground }]}>邀請朋友一起使用</Text>
                <Text style={[styles.shareDescription, { color: colors.muted.foreground }]}>
                  讓更多人即時收到善意提醒
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: '#F59E0B' }]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={18} color="#FFF" />
              <Text style={styles.shareButtonText}>分享給朋友</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View style={[styles.buttonGroup, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary.DEFAULT }]}
            onPress={handleGoHome}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={20} color={colors.primary.foreground} />
            <Text style={[styles.primaryButtonText, { color: colors.primary.foreground }]}>返回首頁</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}
            onPress={handleSendAnother}
            activeOpacity={0.8}
          >
            <Ionicons name="send-outline" size={18} color={colors.foreground} />
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>繼續發送</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SendLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as any,
    marginBottom: spacing[1.5],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.6,
    marginBottom: spacing[5],
  },
  infoCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
    marginBottom: spacing[0.5],
  },
  infoDescription: {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * 1.4,
  },
  shareCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[6],
    width: '100%',
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  shareIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareTextContainer: {
    flex: 1,
  },
  shareTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
    marginBottom: spacing[0.5],
  },
  shareDescription: {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * 1.4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.lg,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
  },
  buttonGroup: {
    width: '100%',
    gap: spacing[3],
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[3.5],
  },
  primaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing[3.5],
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
});
