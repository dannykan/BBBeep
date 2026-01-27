/**
 * Wallet Screen
 * 點數錢包頁面 - Warm Blue 設計
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
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type PurchaseError,
  type Product,
} from 'react-native-iap';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { getTotalPoints, pointsApi, usersApi } from '@bbbeeep/shared';
import type { PointHistory, TrialStatusResponse } from '@bbbeeep/shared';
import GradientBackground from '../../components/GradientBackground';

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
  const [trialStatus, setTrialStatus] = useState<TrialStatusResponse | null>(null);

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

  const loadTrialStatus = useCallback(async () => {
    try {
      const data = await usersApi.getTrialStatus();
      setTrialStatus(data);
    } catch (error) {
      console.error('Failed to load trial status:', error);
    }
  }, []);

  // 載入試用狀態
  useFocusEffect(
    useCallback(() => {
      loadTrialStatus();
    }, [loadTrialStatus])
  );

  // 初始化 IAP
  useEffect(() => {
    let purchaseUpdateSubscription: any;
    let purchaseErrorSubscription: any;
    let isSubscribed = true;

    const initIAP = async () => {
      try {
        const connected = await initConnection();
        console.log('[IAP] Connection result:', connected);

        if (!isSubscribed) return;
        setIapConnected(true);

        // 獲取產品資訊
        if (IAP_SKUS && IAP_SKUS.length > 0) {
          console.log('[IAP] Fetching products:', IAP_SKUS);
          try {
            const products = await fetchProducts({ skus: IAP_SKUS });
            if (!isSubscribed) return;
            if (products && products.length > 0) {
              console.log('[IAP] Products loaded:', products.length, products.map((p) => p.id));
              setIapProducts(products as Product[]);
            }
          } catch (fetchError) {
            // 產品獲取失敗（可能是模擬器或未配置 IAP）
            console.log('[IAP] Fetch products skipped (simulator or not configured)');
          }
        }
      } catch (error: any) {
        // IAP 初始化失敗（模擬器或未配置）- 靜默處理
        console.log('[IAP] Init skipped:', error?.message || 'Not available');
      }
    };

    initIAP();

    // 監聽購買更新
    purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        const receipt = purchase.purchaseToken;
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
      // error.code 可能是 string 或 ErrorCode enum
      const errorCode = String(error.code);
      if (errorCode !== 'E_USER_CANCELLED' && errorCode !== '2') {
        Alert.alert('購買失敗', error.message || '請稍後再試');
      }
    });

    return () => {
      isSubscribed = false;
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
    loadTrialStatus();
  };

  const handleRecharge = async (option: typeof RECHARGE_OPTIONS[0]) => {
    if (!iapConnected) {
      Alert.alert('提示', '儲值服務暫時無法使用，請稍後再試');
      return;
    }

    // 檢查產品是否已載入
    const product = iapProducts.find((p) => p.id === option.productId);
    if (!product) {
      console.warn('[IAP] Product not found:', option.productId, 'Available:', iapProducts.map((p) => p.id));
      Alert.alert('提示', '產品資訊載入中，請稍後再試');
      return;
    }

    setIsRecharging(true);
    setSelectedOption(option.points);

    try {
      console.log('[IAP] Requesting purchase for:', option.productId);
      // react-native-iap v14+ API
      if (Platform.OS === 'ios') {
        await requestPurchase({ sku: option.productId } as any);
      } else {
        await requestPurchase({ skus: [option.productId] } as any);
      }
    } catch (error: any) {
      console.error('[IAP] Purchase error:', error);
      setIsRecharging(false);
      const errorCode = String(error.code);
      if (errorCode !== 'E_USER_CANCELLED' && errorCode !== '2') {
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
        return 'wallet';
      case 'spend':
        return 'paper-plane';
      case 'earn':
        return 'gift';
      case 'bonus':
        return 'gift';
      default:
        return 'swap-horizontal';
    }
  };

  const getHistoryIconColors = (type: string, amount: number) => {
    if (type === 'spend' || amount < 0) {
      return { bg: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2', icon: isDark ? '#F87171' : '#DC2626' };
    }
    if (type === 'earn' || type === 'bonus') {
      return { bg: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7', icon: isDark ? '#4ADE80' : '#22C55E' };
    }
    if (type === 'recharge') {
      return { bg: colors.primary.bg, icon: colors.primary.DEFAULT };
    }
    return { bg: colors.muted.DEFAULT, icon: colors.text.secondary };
  };

  const getHistoryAmountColor = (type: string, amount: number) => {
    if (amount < 0) return '#DC2626';
    if (type === 'earn' || type === 'bonus') return '#22C55E';
    if (type === 'recharge') return colors.primary.DEFAULT;
    return '#22C55E';
  };

  const totalPoints = getTotalPoints(user);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>點數</Text>
        </View>
      </SafeAreaView>

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
        {/* Gradient Balance Card */}
        <View style={styles.balanceCard}>
          <GradientBackground
            colors={['#3B82F6', '#1D4ED8']}
            angle={135}
            style={styles.balanceGradient}
          />
          <View style={styles.balanceContent}>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="wallet" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.balanceLabel}>目前點數餘額</Text>
            <Text style={styles.balanceValue}>{totalPoints}</Text>
            <Text style={styles.balanceUnit}>點</Text>
            {/* Trial Badge */}
            {trialStatus?.isInTrial && trialStatus.daysRemaining > 0 && (
              <View style={styles.trialBadge}>
                <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                <Text style={styles.trialBadgeText}>免費試用剩餘 {trialStatus.daysRemaining} 天</Text>
              </View>
            )}
          </View>
        </View>

        {/* Low Balance Warning */}
        {totalPoints <= 4 && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>點數不足</Text>
              <Text style={styles.warningSubtitle}>
                餘額偏低，建議購買點數以繼續發送提醒
              </Text>
            </View>
          </View>
        )}

        {/* Purchase Plans Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>購買點數</Text>

          {/* 2x2 Grid */}
          <View style={styles.plansGrid}>
            <View style={styles.plansRow}>
              {RECHARGE_OPTIONS.slice(0, 2).map((option) => (
                <TouchableOpacity
                  key={option.points}
                  style={[
                    styles.planCard,
                    option.popular && styles.planCardPopular,
                  ]}
                  onPress={() => handleRecharge(option)}
                  disabled={isRecharging}
                  activeOpacity={0.7}
                >
                  {isRecharging && selectedOption === option.points ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary.DEFAULT}
                      style={styles.planLoading}
                    />
                  ) : (
                    <>
                      {option.popular ? (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularBadgeText}>熱門</Text>
                        </View>
                      ) : (
                        <View style={styles.planSpacer} />
                      )}
                      <Text style={styles.planPoints}>{option.points}</Text>
                      <Text style={styles.planPointsLabel}>點</Text>
                      <Text style={styles.planPrice}>NT$ {option.price}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.plansRow}>
              {RECHARGE_OPTIONS.slice(2, 4).map((option) => (
                <TouchableOpacity
                  key={option.points}
                  style={styles.planCard}
                  onPress={() => handleRecharge(option)}
                  disabled={isRecharging}
                  activeOpacity={0.7}
                >
                  {isRecharging && selectedOption === option.points ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary.DEFAULT}
                      style={styles.planLoading}
                    />
                  ) : (
                    <>
                      <View style={styles.planSpacer} />
                      <Text style={styles.planPoints}>{option.points}</Text>
                      <Text style={styles.planPointsLabel}>點</Text>
                      <Text style={styles.planPrice}>NT$ {option.price}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Point History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>點數紀錄</Text>
          <View style={styles.historyList}>
            {isLoadingHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary.DEFAULT} />
              </View>
            ) : pointHistory.length > 0 ? (
              <>
                {pointHistory.slice(0, 10).map((history) => {
                  const iconColors = getHistoryIconColors(history.type, history.amount);
                  return (
                    <View key={history.id} style={styles.historyItem}>
                      <View style={styles.historyLeft}>
                        <View style={[styles.historyIconContainer, { backgroundColor: iconColors.bg }]}>
                          <Ionicons
                            name={getHistoryIcon(history.type)}
                            size={16}
                            color={iconColors.icon}
                          />
                        </View>
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
                          { color: getHistoryAmountColor(history.type, history.amount) },
                        ]}
                      >
                        {history.amount > 0 ? '+' : ''}{history.amount}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryText}>暫無紀錄</Text>
              </View>
            )}
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
    safeArea: {
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
    },

    // Scroll Content
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      gap: 24,
    },

    // Balance Card
    balanceCard: {
      borderRadius: 20,
      overflow: 'hidden',
      position: 'relative',
    },
    balanceGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    balanceContent: {
      padding: 20,
      alignItems: 'center',
      gap: 8,
    },
    balanceIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    balanceLabel: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    balanceValue: {
      fontSize: 36,
      fontWeight: '700',
      color: '#FFFFFF',
      fontVariant: ['tabular-nums'],
    },
    balanceUnit: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    trialBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 4,
    },
    trialBadgeText: {
      fontSize: 12,
      fontWeight: '500',
      color: '#FFFFFF',
    },

    // Warning Card
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: '#FFFBEB',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#FEF3C7',
    },
    warningTextContainer: {
      flex: 1,
      gap: 4,
    },
    warningTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#92400E',
    },
    warningSubtitle: {
      fontSize: 13,
      color: '#B45309',
      lineHeight: 18,
    },

    // Section
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
    },

    // Plans Grid
    plansGrid: {
      gap: 12,
    },
    plansRow: {
      flexDirection: 'row',
      gap: 12,
    },
    planCard: {
      flex: 1,
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    planCardPopular: {
      backgroundColor: colors.primary.bg,
      borderWidth: 2,
      borderColor: colors.primary.DEFAULT,
    },
    planSpacer: {
      height: 18,
    },
    planLoading: {
      height: 100,
    },
    popularBadge: {
      backgroundColor: colors.primary.DEFAULT,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    popularBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    planPoints: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    planPointsLabel: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    planPrice: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
    },

    // History List
    historyList: {
      gap: 8,
    },
    loadingContainer: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
    },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 12,
      padding: 14,
    },
    historyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    historyIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyInfo: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    historyDescription: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    historyTime: {
      fontSize: 11,
      color: colors.text.secondary,
    },
    historyAmount: {
      fontSize: 16,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    emptyHistory: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
    },
    emptyHistoryText: {
      fontSize: 14,
      color: colors.text.secondary,
    },
  });
