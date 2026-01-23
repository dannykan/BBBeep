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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  initConnection,
  getProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type ProductPurchase,
  type PurchaseError,
  type Product,
} from 'react-native-iap';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { getTotalPoints, pointsApi } from '@bbbeeep/shared';
import type { PointHistory } from '@bbbeeep/shared';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

// IAP 產品 ID（需要在 App Store Connect 設定對應的產品）
const IAP_SKUS = Platform.select({
  ios: [
    'com.ubeep.mobile.points_10',
    'com.ubeep.mobile.points_30',
    'com.ubeep.mobile.points_50',
    'com.ubeep.mobile.points_100',
  ],
  android: [
    'points_10',
    'points_30',
    'points_50',
    'points_100',
  ],
  default: [],
});

const RECHARGE_OPTIONS = [
  { points: 10, price: 30, popular: false, productId: 'com.ubeep.mobile.points_10' },
  { points: 30, price: 80, popular: true, productId: 'com.ubeep.mobile.points_30' },
  { points: 50, price: 120, popular: false, productId: 'com.ubeep.mobile.points_50' },
  { points: 100, price: 200, popular: false, productId: 'com.ubeep.mobile.points_100' },
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
  const [iapProducts, setIapProducts] = useState<Product[]>([]);
  const [iapConnected, setIapConnected] = useState(false);

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

  // 初始化 IAP
  useEffect(() => {
    let purchaseUpdateSubscription: any;
    let purchaseErrorSubscription: any;

    const initIAP = async () => {
      try {
        await initConnection();
        setIapConnected(true);

        // 獲取產品資訊
        if (IAP_SKUS && IAP_SKUS.length > 0) {
          const products = await getProducts({ skus: IAP_SKUS });
          setIapProducts(products);
        }
      } catch (error) {
        console.warn('IAP init error:', error);
      }
    };

    initIAP();

    // 監聽購買更新
    purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: ProductPurchase) => {
        const receipt = purchase.transactionReceipt;
        if (receipt) {
          try {
            // TODO: 向後端驗證收據並加點
            // await pointsApi.verifyPurchase(receipt);
            await refreshUser();
            loadPointHistory();
            Alert.alert('購買成功', '點數已加入您的帳戶！');
          } catch (error) {
            console.error('Purchase verification error:', error);
          }

          // 完成交易
          await finishTransaction({ purchase, isConsumable: true });
        }
        setIsRecharging(false);
      }
    );

    // 監聽購買錯誤
    purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
      console.warn('Purchase error:', error);
      setIsRecharging(false);
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('購買失敗', error.message || '請稍後再試');
      }
    });

    return () => {
      purchaseUpdateSubscription?.remove();
      purchaseErrorSubscription?.remove();
    };
  }, [refreshUser, loadPointHistory]);

  useEffect(() => {
    loadPointHistory();
  }, [loadPointHistory]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshUser();
    loadPointHistory();
  };

  const handleRecharge = async (option: typeof RECHARGE_OPTIONS[0]) => {
    if (!iapConnected) {
      Alert.alert('提示', '儲值服務暫時無法使用，請稍後再試');
      return;
    }

    setIsRecharging(true);
    setSelectedOption(option.points);

    try {
      await requestPurchase({ sku: option.productId });
    } catch (error: any) {
      setIsRecharging(false);
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('購買失敗', error.message || '請稍後再試');
      }
    }
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
              <View
                key={option.points}
                style={[
                  styles.rechargeOption,
                  option.popular && styles.rechargeOptionPopular,
                ]}
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
                <TouchableOpacity
                  style={styles.purchaseButton}
                  onPress={() => handleRecharge(option)}
                  disabled={isRecharging}
                  activeOpacity={0.7}
                >
                  {isRecharging && selectedOption === option.points ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.purchaseButtonText}>購買</Text>
                  )}
                </TouchableOpacity>
              </View>
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
  purchaseButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.primary.foreground,
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
