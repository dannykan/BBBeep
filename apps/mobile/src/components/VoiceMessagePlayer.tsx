/**
 * VoiceMessagePlayer - 統一語音訊息播放器
 *
 * 用於所有語音播放場景：
 * - 訊息詳情頁
 * - 發送紀錄頁
 * - 草稿列表
 * - 一鍵語音頁
 *
 * 特點：
 * - 統一設計風格
 * - 流暢的進度條動畫（50ms 更新間隔）
 * - 可配置：compact, showLabel, label 自訂
 * - 支援全域預載快取（VoicePreloadContext）
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
  ActivityIndicator,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useVoicePreload } from '../context/VoicePreloadContext';

interface VoiceMessagePlayerProps {
  voiceUrl: string;
  duration?: number;
  showLabel?: boolean;
  label?: string;
  compact?: boolean;
}

export function VoiceMessagePlayer({
  voiceUrl,
  duration = 0,
  showLabel = true,
  label = '語音訊息',
  compact = false,
}: VoiceMessagePlayerProps) {
  const { colors } = useTheme();
  const { getPreloadedSound, preloadAudio: preloadToCache } = useVoicePreload();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const trackWidth = useRef(0);
  const trackX = useRef(0);
  const lastProgress = useRef(0);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const usedCacheRef = useRef(false);
  const wasPlayingBeforeSeek = useRef(false);
  const isLoadingRef = useRef(true);
  const isPlayingRef = useRef(false);
  const totalDurationRef = useRef(duration);

  // 同步 ref 和 state
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    totalDurationRef.current = totalDuration;
  }, [totalDuration]);

  // 載入音訊（優先使用全域快取，支援串流播放）
  useEffect(() => {
    let isMounted = true;

    const loadAudio = async () => {
      try {
        // 1. 先檢查全域快取
        const cachedSound = getPreloadedSound(voiceUrl);
        if (cachedSound) {
          console.log('[VoicePlayer] Using cached audio');
          cachedSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
          if (isMounted) {
            soundRef.current = cachedSound;
            setSound(cachedSound);
            setIsLoading(false);
            usedCacheRef.current = true;
          }
          return;
        }

        // 2. 沒有快取，使用串流模式載入（邊下載邊播放）
        console.log('[VoicePlayer] Loading audio (streaming mode)...');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: voiceUrl },
          {
            shouldPlay: false,
            progressUpdateIntervalMillis: 50,
            // 串流模式：不等完整下載就可以播放
            androidImplementation: 'MediaPlayer',
          },
          onPlaybackStatusUpdate,
          // downloadFirst: false 讓 iOS 也支援串流
          false
        );

        if (isMounted) {
          soundRef.current = newSound;
          setSound(newSound);
          setIsLoading(false);
          usedCacheRef.current = false;
        } else {
          newSound.unloadAsync();
        }
      } catch (err) {
        console.error('Audio load error:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAudio();

    return () => {
      isMounted = false;
      if (soundRef.current && !usedCacheRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [voiceUrl, getPreloadedSound]);

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
        // 停止動畫
        if (animationRef.current) {
          animationRef.current.stop();
        }
      } else if (sound) {
        // 音訊已預載，直接播放（無延遲）
        await sound.playAsync();
        setIsPlaying(true);
      }
      // 如果 sound 還是 null（預載失敗），不做任何事
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      // 更新實際時長
      if (status.durationMillis && totalDuration === 0) {
        setTotalDuration(status.durationMillis / 1000);
      }

      // 拖曳中不更新進度（讓用戶控制）
      if (isSeeking) return;

      const currentDuration = status.durationMillis || totalDuration * 1000;
      const progress = currentDuration > 0
        ? status.positionMillis / currentDuration
        : 0;

      setPosition(status.positionMillis / 1000);

      // 使用 timing 動畫讓進度條平滑過渡
      if (Math.abs(progress - lastProgress.current) > 0.001) {
        if (animationRef.current) {
          animationRef.current.stop();
        }
        animationRef.current = Animated.timing(progressAnim, {
          toValue: progress,
          duration: 60, // 略長於更新間隔，確保平滑
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
  }, [totalDuration, progressAnim, isSeeking]);

  // PanResponder 處理拖曳手勢
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isLoadingRef.current,
      onMoveShouldSetPanResponder: () => !isLoadingRef.current,
      onPanResponderGrant: async (evt: GestureResponderEvent) => {
        // 立即提取事件數據（避免事件池回收問題）
        const pageX = evt.nativeEvent.pageX;

        // 開始拖曳
        setIsSeeking(true);
        wasPlayingBeforeSeek.current = isPlayingRef.current;

        // 計算初始位置（在 async 操作前）
        const relativeX = pageX - trackX.current;
        const progress = Math.max(0, Math.min(1, relativeX / trackWidth.current));
        setSeekPosition(progress);
        progressAnim.setValue(progress);

        // 暫停播放
        if (isPlayingRef.current && soundRef.current) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        }

        // 停止動畫
        if (animationRef.current) {
          animationRef.current.stop();
        }
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        // 拖曳中，更新進度
        const relativeX = evt.nativeEvent.pageX - trackX.current;
        const progress = Math.max(0, Math.min(1, relativeX / trackWidth.current));
        setSeekPosition(progress);
        progressAnim.setValue(progress);
      },
      onPanResponderRelease: async (evt: GestureResponderEvent) => {
        // 立即提取事件數據（避免事件池回收問題）
        const pageX = evt.nativeEvent.pageX;

        // 拖曳結束，計算最終位置
        const relativeX = pageX - trackX.current;
        const progress = Math.max(0, Math.min(1, relativeX / trackWidth.current));

        // 跳轉到新位置
        if (soundRef.current) {
          try {
            const newPositionMs = progress * (totalDurationRef.current || 1) * 1000;
            await soundRef.current.setPositionAsync(newPositionMs);
            progressAnim.setValue(progress);
            lastProgress.current = progress;
          } catch (err) {
            console.error('Seek error:', err);
          }
        }

        setIsSeeking(false);

        // 如果之前正在播放，繼續播放
        if (wasPlayingBeforeSeek.current && soundRef.current) {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      },
      onPanResponderTerminate: async () => {
        // 手勢被中斷
        setIsSeeking(false);
        if (wasPlayingBeforeSeek.current && soundRef.current) {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      },
    })
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
    // 獲取進度條的絕對位置
    e.target.measure((x, y, width, height, pageX, pageY) => {
      trackX.current = pageX;
    });
  };

  const buttonSize = compact ? 44 : 48;
  const iconSize = compact ? 20 : 22;

  return (
    <View style={[
      styles.container,
      { backgroundColor: colors.primary.soft, borderColor: colors.primary.DEFAULT + '30' },
      compact && styles.containerCompact,
    ]}>
      <TouchableOpacity
        style={[
          styles.playButton,
          { backgroundColor: colors.primary.DEFAULT, width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
          isLoading && { opacity: 0.7 },
        ]}
        onPress={handlePlayPause}
        activeOpacity={0.8}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={iconSize}
            color="#fff"
          />
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        {showLabel && (
          <View style={styles.labelRow}>
            <Ionicons name="mic" size={14} color={colors.primary.DEFAULT} />
            <Text style={[styles.label, { color: colors.primary.DEFAULT }]}>
              {label}
            </Text>
          </View>
        )}

        {/* Progress bar with seekable slider */}
        <View
          style={styles.progressContainer}
          {...panResponder.panHandlers}
        >
          <View
            style={[styles.progressTrack, { backgroundColor: colors.border }]}
            onLayout={onTrackLayout}
          >
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
          {/* Seekable thumb/knob */}
          <Animated.View
            style={[
              styles.progressThumb,
              {
                backgroundColor: colors.primary.DEFAULT,
                left: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                // 拖曳時放大滑塊
                transform: [{ scale: isSeeking ? 1.3 : 1 }],
              },
            ]}
          />
        </View>

        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: colors.muted.foreground }]}>
            {formatDuration(position)}
          </Text>
          <Text style={[styles.time, { color: colors.muted.foreground }]}>
            {formatDuration(totalDuration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  containerCompact: {
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    height: 24, // 增加觸摸區域
    justifyContent: 'center',
    position: 'relative',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7, // 讓圓心對齊進度位置
    top: 5, // (24 - 14) / 2 = 5，垂直置中
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
