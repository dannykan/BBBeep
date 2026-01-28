/**
 * DraftsScreen - 語音草稿列表頁
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useDraft } from '../../context/DraftContext';
import { DraftCard } from './components/DraftCard';
import type { VoiceDraft } from '@bbbeeep/shared';

export function DraftsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { drafts, isLoading, error, fetchDrafts, deleteDraft } = useDraft();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDrafts();
    setRefreshing(false);
  }, [fetchDrafts]);

  const handleDelete = useCallback(
    async (id: string) => {
      Alert.alert('刪除草稿', '確定要刪除這個草稿嗎？', [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDraft(id);
            } catch (err: any) {
              Alert.alert('錯誤', err.message);
            }
          },
        },
      ]);
    },
    [deleteDraft],
  );

  const handleSend = useCallback(
    (draft: VoiceDraft) => {
      // 直接導航到語音提醒頁面
      navigation.navigate('QuickVoiceSend', {
        voiceUri: draft.voiceUrl,
        voiceDuration: draft.voiceDuration,
        transcript: draft.transcript || '',
        recordedAt: draft.createdAt,
        latitude: draft.latitude,
        longitude: draft.longitude,
        address: draft.address,
      });
    },
    [navigation],
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary.soft }]}>
        <Ionicons name="mic-outline" size={48} color={colors.primary.DEFAULT} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
        沒有語音草稿
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted.foreground }]}>
        開車時按下快速錄音按鈕{'\n'}記錄車牌和事件，稍後再發送
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: VoiceDraft }) => (
    <DraftCard
      draft={item}
      onDelete={() => handleDelete(item.id)}
      onSend={() => handleSend(item)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
          <Text style={[styles.backText, { color: colors.muted.foreground }]}>返回</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          語音草稿
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* 提示 */}
      {drafts.length > 0 && (
        <View style={[styles.tipBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
          <Ionicons name="time-outline" size={18} color="#F59E0B" />
          <Text style={[styles.tipText, { color: '#F59E0B' }]}>
            草稿會在 24 小時後自動刪除
          </Text>
        </View>
      )}

      {/* 列表 */}
      <FlatList
        data={drafts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          drafts.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    zIndex: 1,
  },
  backText: {
    fontSize: 14,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerRight: {
    width: 80,
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
