/**
 * VoiceMemoPlayer - 語音備忘播放器
 *
 * 顯示在發送流程畫面最上方，讓用戶可以隨時播放錄音
 *
 * 特點：
 * - 流暢的進度條動畫（50ms 更新間隔）
 * - 與 VoiceMessagePlayer 設計一致
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSend, VoiceMemo } from '../context/SendContext';
import { typography, spacing, borderRadius } from '../theme';

export function VoiceMemoPlayer() {
  const { colors } = useTheme();
  const { voiceMemo } = useSend();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const lastProgress = useRef(0);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // 清理音訊
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [sound]);

  if (!voiceMemo) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
        if (animationRef.current) {
          animationRef.current.stop();
        }
      } else if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      } else {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: voiceMemo.uri },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 50, // 流暢更新
          },
          onPlaybackStatusUpdate,
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      const progress = status.durationMillis > 0
        ? status.positionMillis / status.durationMillis
        : 0;
      setPosition(status.positionMillis / 1000);

      // 使用 timing 動畫讓進度條平滑過渡
      if (Math.abs(progress - lastProgress.current) > 0.001) {
        if (animationRef.current) {
          animationRef.current.stop();
        }
        animationRef.current = Animated.timing(progressAnim, {
          toValue: progress,
          duration: 60,
          useNativeDriver: false,
        });
        animationRef.current.start();
        lastProgress.current = progress;
      }

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        progressAnim.setValue(0);
        lastProgress.current = 0;
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: colors.primary.DEFAULT }]}
        onPress={handlePlayPause}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={16}
          color="#fff"
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <View style={styles.labelContainer}>
            <Ionicons name="mic" size={12} color={colors.primary.DEFAULT} />
            <Text style={[styles.label, { color: colors.primary.DEFAULT }]}>
              語音備忘
            </Text>
          </View>
          <Text style={[styles.duration, { color: colors.muted.foreground }]}>
            {formatDuration(isPlaying ? position : voiceMemo.duration)}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary.DEFAULT,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {voiceMemo.transcript && (
          <Text
            style={[styles.transcript, { color: colors.muted.foreground }]}
            numberOfLines={1}
          >
            「{voiceMemo.transcript}」
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing[1.5],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
  },
  duration: {
    fontSize: typography.fontSize.xs,
    fontFamily: 'monospace',
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  transcript: {
    fontSize: typography.fontSize.xs,
  },
});
