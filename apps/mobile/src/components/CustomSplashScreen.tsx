/**
 * Custom Splash Screen
 * 顯示 UBeep logo 和標語，支援 light/dark mode
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';

// 品牌主色藍
const BRAND_BLUE = '#3B82F6';

// Splash screen 固定使用藍色背景、白色文字
const SPLASH_COLORS = {
  background: BRAND_BLUE,
  tagline: '#FFFFFF',
  dots: '#FFFFFF',
};

interface CustomSplashScreenProps {
  onFinish: () => void;
}

export default function CustomSplashScreen({ onFinish }: CustomSplashScreenProps) {
  const colors = SPLASH_COLORS;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Dot animations with scale
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot1Scale = useRef(new Animated.Value(0.8)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Scale = useRef(new Animated.Value(0.8)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Scale = useRef(new Animated.Value(0.8)).current;

  // Loading dots animation with scale
  useEffect(() => {
    const duration = 700; // half of 1.4s
    const delay = 200;

    const createDotAnimation = (opacity: Animated.Value, scale: Animated.Value) => {
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1.1,
              duration,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0.3,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.8,
              duration,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    createDotAnimation(dot1Opacity, dot1Scale).start();

    const timer2 = setTimeout(() => {
      createDotAnimation(dot2Opacity, dot2Scale).start();
    }, delay);

    const timer3 = setTimeout(() => {
      createDotAnimation(dot3Opacity, dot3Scale).start();
    }, delay * 2);

    return () => {
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [dot1Opacity, dot1Scale, dot2Opacity, dot2Scale, dot3Opacity, dot3Scale]);

  // Main fade in animation
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        // 等待後結束
        setTimeout(() => {
          onFinish();
        }, 1800);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [fadeAnim, onFinish]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        {/* Tagline */}
        <Text style={[styles.tagline, { color: colors.tagline }]}>
          一鍵提醒，避免衝突{'\n'}讓道路溝通更友善
        </Text>

        {/* Loading dots */}
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot1Opacity,
                transform: [{ scale: dot1Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot2Opacity,
                transform: [{ scale: dot2Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot3Opacity,
                transform: [{ scale: dot3Scale }],
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const LOGO_SIZE = 128; // w-32 = 128px

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 24, // rounded-3xl
    overflow: 'hidden',
    marginBottom: 32,
    // 強化陰影效果
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  tagline: {
    fontSize: 16,
    letterSpacing: 1,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24, // pt-6
    gap: 8, // space-x-2
  },
  dot: {
    width: 8, // w-2
    height: 8, // h-2
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
