/**
 * Wallet Screen
 * 點數錢包頁面 - 對齊 Web 版本設計
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { getTotalPoints, pointsApi } from '@bbbeeep/shared';
import type { PointHistory } from '@bbbeeep/shared';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

const RECHARGE_OPTIONS = [
  { points: 10, price: 30, popular: false },
  { points: 30, price: 80, popular: true },
  { points: 50, price: 120, popular: false },
  { points: 100, price: 200, popular: false },
];

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRecharging, setIsRecharging] = useState(false);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPointHistory = useCallback(async () => {
    try {
      const history = await pointsApi.getHistory();
      setPointHistory(history);
    } catch (error) {
      console.error('Failed to load point history:', error);
    } finally {
      setIsLoadingHistory(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPointHistory();
  }, [loadPointHistory]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshUser();
    loadPointHistory();
  };

  const handleRecharge = async (points: number) => {
    Alert.alert('提示', '儲值功能尚未開通，敬請期待！');
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return '剛剛';
      if (diffMins < 60) return `${diffMins} 分鐘前`;
      if (diffHours < 24) return `${diffHours} 小時前`;
      if (diffDays < 7) return `${diffDays} 天前`;
      return date.toLocaleDateString('zh-TW');
    } catch {
      return '未知時間';
    }
  };

  const getHistoryIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'recharge':
        return 'trending-up';
      case 'spend':
        return 'trending-down';
      case 'earn':
        return 'trending-up';
      case 'bonus':
        return 'gift-outline';
      default:
        return 'swap-horizontal';
    }
  };

  const getHistoryColor = (amount: number) => {
    return amount > 0 ? (isDark ? '#4ADE80' : '#16A34A') : (isDark ? '#F87171' : '#DC2626');
  };

  const totalPoints = getTotalPoints(user);

  return (
    <View style={styles.container}>
      {/* Header with safe area */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.muted.foreground}
              />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>點數</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.DEFAULT}
          />
        }
      >
        {/* Points Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>目前剩餘</Text>
          <Text style={styles.balanceValue}>{totalPoints}</Text>
          <Text style={styles.balanceUnit}>點</Text>
        </View>

        {/* Recharge Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>儲值方案</Text>
          <View style={styles.rechargeOptions}>
            {RECHARGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.points}
                style={[
                  styles.rechargeOption,
                  selectedOption === option.points && styles.rechargeOptionSelected,
                  option.popular && styles.rechargeOptionPopular,
                ]}
                onPress={() => setSelectedOption(option.points)}
                activeOpacity={0.7}
              >
                <View style={styles.rechargeOptionLeft}>
                  <View style={styles.rechargePointsRow}>
                    <Text style={styles.rechargePoints}>{option.points}</Text>
                    <Text style={styles.rechargePointsUnit}>點</Text>
                    {option.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>推薦</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rechargePrice}>NT$ {option.price}</Text>
                </View>
                <View style={styles.rechargeOptionRight}>
                  <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                  <Text style={styles.notOpenText}>尚未開通</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Point History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>點數紀錄</Text>
          <View style={styles.historyCard}>
            {isLoadingHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary.DEFAULT} />
              </View>
            ) : pointHistory.length > 0 ? (
              <>
                {pointHistory.slice(0, 10).map((history, index) => (
                  <View
                    key={history.id}
                    style={[
                      styles.historyItem,
                      index < Math.min(pointHistory.length, 10) - 1 && styles.historyItemBorder,
                    ]}
                  >
                    <View style={styles.historyLeft}>
                      <Ionicons
                        name={getHistoryIcon(history.type)}
                        size={16}
                        color={getHistoryColor(history.amount)}
                      />
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyDescription} numberOfLines={1}>
                          {history.description}
                        </Text>
                        <Text style={styles.historyTime}>
                          {formatTime(history.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.historyAmount,
                        { color: getHistoryColor(history.amount) },
                      ]}
                    >
                      {history.amount > 0 ? '+' : ''}{history.amount}
                    </Text>
                  </View>
                ))}
                {pointHistory.length > 10 && (
                  <View style={styles.moreRecords}>
                    <Text style={styles.moreRecordsText}>
                      還有 {pointHistory.length - 10} 筆記錄
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryText}>暫無紀錄</Text>
              </View>
            )}
          </View>
        </View>

        {/* Points Pricing Info */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>車況提醒</Text>
              <Text style={styles.infoValue}>1 點</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>行車安全提醒（模板）</Text>
              <Text style={styles.infoValue}>1 點</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>行車安全提醒（補充文字）</Text>
              <Text style={styles.infoValue}>4 點</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>AI 協助改寫</Text>
              <Text style={styles.infoValue}>+1 點</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>讚美感謝</Text>
              <Text style={[styles.infoValue, styles.infoValueFree]}>免費</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>收到讚美回饋</Text>
              <Text style={[styles.infoValue, styles.infoValueFree]}>+1 點</Text>
            </View>
            <View style={styles.infoDivider} />
            <Text style={styles.infoNote}>點數永久有效</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

  // Header
  headerContainer: {
    backgroundColor: colors.card.DEFAULT,
  },
  headerSafeArea: {
    backgroundColor: colors.card.DEFAULT,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSolid,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[1],
  },
  backText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    marginLeft: spacing[1],
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal as any,
    color: colors.foreground,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 80,
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[6],
    gap: spacing[6],
  },

  // Balance Card
  balanceCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.borderSolid,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    marginBottom: spacing[2],
  },
  balanceValue: {
    fontSize: 56,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.primary.dark,
    fontVariant: ['tabular-nums'],
  },
  balanceUnit: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    marginTop: spacing[1],
  },

  // Section
  section: {
    gap: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },

  // Recharge Options
  rechargeOptions: {
    gap: spacing[2],
  },
  rechargeOption: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderSolid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rechargeOptionSelected: {
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.soft,
  },
  rechargeOptionPopular: {
    borderColor: `${colors.primary.DEFAULT}50`,
  },
  rechargeOptionLeft: {
    flex: 1,
  },
  rechargePointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[1.5],
  },
  rechargePoints: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  rechargePointsUnit: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },
  popularBadge: {
    backgroundColor: `${colors.primary.DEFAULT}15`,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
    marginLeft: spacing[1],
  },
  popularBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary.DEFAULT,
  },
  rechargePrice: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    marginTop: spacing[1],
    fontVariant: ['tabular-nums'],
  },
  rechargeOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  notOpenText: {
    fontSize: typography.fontSize.xs,
    color: isDark ? '#F0B454' : '#D97706',
  },

  // History Card
  historyCard: {
    backgroundColor: colors.card.DEFAULT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: spacing[8],
    alignItems: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSolid,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
    minWidth: 0,
  },
  historyInfo: {
    flex: 1,
    minWidth: 0,
  },
  historyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    marginBottom: spacing[0.5],
  },
  historyTime: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    fontVariant: ['tabular-nums'],
  },
  historyAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    fontVariant: ['tabular-nums'],
  },
  moreRecords: {
    padding: spacing[4],
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSolid,
  },
  moreRecordsText: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },
  emptyHistory: {
    padding: spacing[8],
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },

  // Info Card
  infoCard: {
    backgroundColor: `${colors.muted.DEFAULT}30`,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.borderSolid,
    gap: spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  infoValue: {
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  infoValueFree: {
    color: isDark ? '#4ADE80' : '#16A34A',
  },
  infoDivider: {
    height: 1,
    backgroundColor: `${colors.borderSolid}50`,
    marginVertical: spacing[1],
  },
  infoNote: {
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
    marginTop: spacing[1],
  },
  });
