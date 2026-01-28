/**
 * DraftCard - 草稿卡片組件
 * 簡化版：只顯示語音播放器，不顯示 AI 分析結果
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import type { VoiceDraft } from '@bbbeeep/shared';

interface DraftCardProps {
  draft: VoiceDraft;
  onDelete: () => void;
  onSend: () => void;
}

export function DraftCard({ draft, onDelete, onSend }: DraftCardProps) {
  const { colors } = useTheme();

  // 語音播放狀態
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // 清理音訊
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlayPause = async () => {
    try {
      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: draft.voiceUrl },
          { shouldPlay: true },
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
      const progress = status.positionMillis / status.durationMillis;
      setPlaybackPosition(status.positionMillis / 1000);
      progressAnim.setValue(progress);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        progressAnim.setValue(0);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    return `${Math.floor(hours / 24)} 天前`;
  };

  const getExpiryInfo = () => {
    const expiresAt = new Date(draft.expiresAt);
    const now = new Date();
    const hoursLeft = Math.floor((expiresAt.getTime() - now.getTime()) / 3600000);

    if (hoursLeft <= 2) {
      return { text: `${hoursLeft} 小時後過期`, urgent: true };
    }
    return { text: `${hoursLeft} 小時後過期`, urgent: false };
  };

  const expiryInfo = getExpiryInfo();

  return (
    <View style={[styles.card, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.timeText, { color: colors.muted.foreground }]}>
            {formatRelativeTime(draft.createdAt)}
          </Text>
        </View>
        <Text
          style={[
            styles.expiryText,
            { color: expiryInfo.urgent ? colors.destructive.DEFAULT : colors.muted.foreground },
          ]}
        >
          {expiryInfo.text}
        </Text>
      </View>

      {/* 語音播放器 */}
      <View style={styles.playerSection}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: colors.primary.DEFAULT }]}
          onPress={handlePlayPause}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
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
          <View style={styles.timeRow}>
            <Text style={[styles.timeSmall, { color: colors.muted.foreground }]}>
              {formatTime(playbackPosition)}
            </Text>
            <Text style={[styles.timeSmall, { color: colors.muted.foreground }]}>
              {formatTime(draft.voiceDuration)}
            </Text>
          </View>
        </View>
      </View>

      {/* 轉錄文字（如有） */}
      {draft.transcript && (
        <View style={[styles.transcriptBox, { backgroundColor: colors.muted.DEFAULT }]}>
          <Text style={[styles.transcriptText, { color: colors.text.primary }]} numberOfLines={3}>
            「{draft.transcript}」
          </Text>
        </View>
      )}

      {/* 地點（如有） */}
      {draft.address && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
          <Text style={[styles.locationText, { color: colors.muted.foreground }]} numberOfLines={1}>
            {draft.address}
          </Text>
        </View>
      )}

      {/* 按鈕 */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.border }]}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={18} color={colors.text.secondary} />
          <Text style={[styles.deleteButtonText, { color: colors.muted.foreground }]}>
            刪除
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary.DEFAULT }]}
          onPress={onSend}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.sendButtonText}>繼續編輯</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 13,
  },
  expiryText: {
    fontSize: 12,
  },
  playerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
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
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeSmall: {
    fontSize: 11,
  },
  transcriptBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sendButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
