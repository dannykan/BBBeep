/**
 * DraftCard - 草稿卡片組件
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
import { useTheme } from '../../../theme/ThemeContext';
import type { VoiceDraft, ParsedPlate } from '@bbbeeep/shared';

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

  const getCategoryIcon = () => {
    const category = draft.parsedEvent?.category;
    switch (category) {
      case 'VEHICLE_REMINDER':
        return 'car-outline';
      case 'SAFETY_REMINDER':
        return 'warning-outline';
      case 'PRAISE':
        return 'heart-outline';
      default:
        return 'chatbubble-outline';
    }
  };

  const getCategoryText = () => {
    const category = draft.parsedEvent?.category;
    switch (category) {
      case 'VEHICLE_REMINDER':
        return '車況提醒';
      case 'SAFETY_REMINDER':
        return '行車安全';
      case 'PRAISE':
        return '讚美感謝';
      default:
        return '其他';
    }
  };

  const expiryInfo = getExpiryInfo();
  const isProcessing = draft.status === 'PROCESSING';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: isProcessing ? colors.warning : '#10B981' }]} />
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatRelativeTime(draft.createdAt)}
          </Text>
        </View>
        <Text
          style={[
            styles.expiryText,
            { color: expiryInfo.urgent ? colors.error : colors.textTertiary },
          ]}
        >
          {expiryInfo.text}
        </Text>
      </View>

      {/* 處理中狀態 */}
      {isProcessing && (
        <View style={[styles.processingBanner, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="hourglass-outline" size={16} color={colors.warning} />
          <Text style={[styles.processingText, { color: colors.warning }]}>
            AI 正在分析中...
          </Text>
        </View>
      )}

      {/* 車牌候選 */}
      {draft.parsedPlates.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            車牌候選
          </Text>
          <View style={styles.platesRow}>
            {draft.parsedPlates.map((plate, index) => (
              <View
                key={plate.plate}
                style={[
                  styles.plateChip,
                  {
                    backgroundColor: index === 0 ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.plateText,
                    { color: index === 0 ? '#fff' : colors.text },
                  ]}
                >
                  {plate.plate}
                </Text>
                {index === 0 && (
                  <Text style={styles.confidenceText}>
                    {Math.round(plate.confidence * 100)}%
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 車輛資訊 */}
      {draft.parsedVehicle && draft.parsedVehicle.type !== 'unknown' && (
        <View style={styles.vehicleInfo}>
          <Ionicons
            name={draft.parsedVehicle.type === 'car' ? 'car' : 'bicycle'}
            size={16}
            color={colors.textSecondary}
          />
          <Text style={[styles.vehicleText, { color: colors.textSecondary }]}>
            {[
              draft.parsedVehicle.color,
              draft.parsedVehicle.brand,
              draft.parsedVehicle.model,
            ]
              .filter(Boolean)
              .join(' ')}
          </Text>
        </View>
      )}

      {/* 事件類型 */}
      {draft.parsedEvent && (
        <View style={styles.eventInfo}>
          <View style={[styles.eventBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={getCategoryIcon() as any} size={14} color={colors.primary} />
            <Text style={[styles.eventBadgeText, { color: colors.primary }]}>
              {getCategoryText()}
            </Text>
          </View>
          <Text style={[styles.eventDescription, { color: colors.text }]}>
            {draft.parsedEvent.description}
          </Text>
        </View>
      )}

      {/* 語音播放器 */}
      <View style={styles.playerSection}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: colors.primary }]}
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
                  backgroundColor: colors.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={[styles.timeSmall, { color: colors.textTertiary }]}>
              {formatTime(playbackPosition)}
            </Text>
            <Text style={[styles.timeSmall, { color: colors.textTertiary }]}>
              {formatTime(draft.voiceDuration)}
            </Text>
          </View>
        </View>
      </View>

      {/* AI 建議訊息 */}
      {draft.suggestedMessage && (
        <View style={[styles.suggestionBox, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.suggestionHeader}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={[styles.suggestionLabel, { color: colors.primary }]}>
              AI 建議訊息
            </Text>
          </View>
          <Text style={[styles.suggestionText, { color: colors.text }]}>
            {draft.suggestedMessage}
          </Text>
        </View>
      )}

      {/* 按鈕 */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.border }]}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.deleteButtonText, { color: colors.textSecondary }]}>
            刪除
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: isProcessing ? colors.border : colors.primary,
            },
          ]}
          onPress={onSend}
          disabled={isProcessing}
        >
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={styles.sendButtonText}>發送提醒</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  processingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  platesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  plateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  plateText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  confidenceText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 13,
  },
  eventInfo: {
    marginBottom: 12,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventDescription: {
    fontSize: 14,
  },
  playerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  suggestionBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  suggestionText: {
    fontSize: 14,
    lineHeight: 20,
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
