/**
 * DraftCard - 草稿卡片組件
 * 簡化版：只顯示語音播放器，不顯示 AI 分析結果
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { VoiceMessagePlayer } from '../../../components/VoiceMessagePlayer';
import type { VoiceDraft } from '@bbbeeep/shared';

interface DraftCardProps {
  draft: VoiceDraft;
  onDelete: () => void;
  onSend: () => void;
}

export function DraftCard({ draft, onDelete, onSend }: DraftCardProps) {
  const { colors } = useTheme();

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

      {/* 語音播放器 - 使用統一組件 */}
      <View style={styles.playerSection}>
        <VoiceMessagePlayer
          voiceUrl={draft.voiceUrl}
          duration={draft.voiceDuration}
          showLabel={false}
          compact
        />
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
    marginBottom: 12,
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
