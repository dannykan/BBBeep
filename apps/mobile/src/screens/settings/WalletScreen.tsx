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
import { analytics } from '../../lib/analytics';
import type { PointHistory, TrialStatusResponse } from '@bbbeeep/shared';
import GradientBackground from '../../components/GradientBackground';

// IAP 產品 ID（需要在 App Store Connect 設定對應的產品）
const IAP_SKUS = Platform.select({
  ios: [
    'com.ubeep.mobile.points_15',
    'com.ubeep.mobile.points_40',
    'com.ubeep.mobile.points_120',
    'com.ubeep.mobile.points_300',
  ],
  android: [
    'points_15',
    'points_40',
    'points_120',
    'points_300',
  ],
  default: [],
});

const RECHARGE_OPTIONS = [
  { points: 15, price: 75, popular: false, productId: 'com.ubeep.mobile.points_15' },
  { points: 40, price: 150, popular: true, productId: 'com.ubeep.mobile.points_40' },
  { points: 120, price: 300, popular: false, productId: 'com.ubeep.mobile.points_120' },
  { points: 300, price: 600, popular: false, productId: 'com.ubeep.mobile.points_300' },
];

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // 根據試用剩餘天數返回對應顏色
  const getTrialColors = useCallback((daysRemaining: number) => {
    if (daysRemaining >= 7) {
      // 紫色 - 正常狀態
      return { bg: 'rgba(139, 92, 246, 0.3)', text: '#FFFFFF', icon: '#E9D5FF' };
    } else if (daysRemaining >= 4) {
      // 橘色 - 提醒快到期
      return { bg: 'rgba(251, 191, 36, 0.4)', text: '#FFFFFF', icon: '#FEF3C7' };
    } else {
      // 紅色 - 緊急提醒
      return { bg: 'rgba(239, 68, 68, 0.4)', text: '#FFFFFF', icon: '#FECACA' };
    }
  }, []);

  const trialColors = useMemo(() => {
    return getTrialColors(trialStatus?.daysRemaining ?? 14);
  }, [trialStatus?.daysRemaining, getTrialColors]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRecharging, setIsRecharging] = useState(false);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [iapProducts, setIapProducts] = useState<Product[]>([]);
  const [iapConnected, setIapConnected] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
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
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    const fetchProductsWithRetry = async (): Promise<Product[]> => {
      while (retryCount < MAX_RETRIES) {
        try {
          console.log(`[IAP] Fetching products (attempt ${retryCount + 1}/${MAX_RETRIES}):`, IAP_SKUS);
          const products = await fetchProducts({ skus: IAP_SKUS! });
          if (products && products.length > 0) {
            console.log('[IAP] Products loaded:', products.length, products.map((p) => p.id));
            return products as Product[];
          }
          console.log('[IAP] No products returned, retrying...');
        } catch (fetchError) {
          console.log(`[IAP] Fetch attempt ${retryCount + 1} failed:`, fetchError);
        }
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
      return [];
    };

    const initIAP = async () => {
      setIsLoadingProducts(true);
      try {
        const connected = await initConnection();
        console.log('[IAP] Connection result:', connected);

        if (!isSubscribed) return;
        setIapConnected(true);

        // 獲取產品資訊（帶重試機制）
        if (IAP_SKUS && IAP_SKUS.length > 0) {
          const products = await fetchProductsWithRetry();
          if (!isSubscribed) return;
          setIapProducts(products);
        }
      } catch (error: any) {
        // IAP 初始化失敗（模擬器或未配置）- 靜默處理
        console.log('[IAP] Init skipped:', error?.message || 'Not available');
      } finally {
        if (isSubscribed) {
          setIsLoadingProducts(false);
        }
      }
    };

    initIAP();

    // 監聽購買更新
    purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log('[IAP] Purchase updated:', JSON.stringify({
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          // iOS 用 transactionReceipt, Android 用 purchaseToken
        }));

        try {
          // 取得交易 ID 和收據
          // iOS: transactionId + transactionReceipt
          // Android: purchaseToken (同時作為交易 ID 和收據)
          const transactionId = Platform.OS === 'ios'
            ? purchase.transactionId
            : purchase.purchaseToken;

          const receiptData = Platform.OS === 'ios'
            ? purchase.transactionReceipt
            : purchase.purchaseToken;

          if (!transactionId) {
            throw new Error('Missing transaction ID');
          }

          // 呼叫後端驗證 API
          const result = await pointsApi.verifyIAP({
            transactionId,
            productId: purchase.productId,
            platform: Platform.OS as 'ios' | 'android',
            receiptData,
          });

          console.log('[IAP] Verify result:', result);

          if (result.success) {
            await refreshUser();
            loadPointHistory();

            if (result.pointsAwarded > 0) {
              // Analytics 追踪购买成功
              analytics.trackIapComplete(purchase.productId, result.pointsAwarded);
              Alert.alert('購買成功', `已加入 ${result.pointsAwarded} 點到您的帳戶！`);
            } else if (result.error) {
              // 已處理過的交易
              Alert.alert('提示', result.error);
            }
          } else {
            throw new Error(result.error || '驗證失敗');
          }
        } catch (error: any) {
          console.error('[IAP] Purchase verification error:', error);
          // Analytics 追踪验证失败
          analytics.trackIapFailed(purchase.productId, error.message || 'verification_failed');
          Alert.alert('加點失敗', error.message || '購買成功但點數加值失敗，請聯繫客服');
        }

        // 完成交易
        await finishTransaction({ purchase, isConsumable: true });
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshUser(),
        loadPointHistory(),
        loadTrialStatus(),
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshUser, loadPointHistory, loadTrialStatus]);

  const handleRecharge = async (option: typeof RECHARGE_OPTIONS[0]) => {
    if (!iapConnected) {
      Alert.alert('提示', '儲值服務暫時無法使用，請稍後再試');
      return;
    }

    // 檢查產品是否正在載入
    if (isLoadingProducts) {
      Alert.alert('提示', '產品資訊載入中，請稍等幾秒後再試');
      return;
    }

    // 檢查產品是否已載入
    const product = iapProducts.find((p) => p.id === option.productId);
    if (!product) {
      console.warn('[IAP] Product not found:', option.productId, 'Available:', iapProducts.map((p) => p.id));
      Alert.alert(
        '產品載入失敗',
        '無法取得產品資訊，請下拉重新整理頁面後再試。',
        [{ text: '好的' }]
      );
      return;
    }

    setIsRecharging(true);
    setSelectedOption(option.points);

    // Analytics 追踪购买开始
    analytics.trackIapInitiated(option.productId);

    try {
      console.log('[IAP] Requesting purchase for:', option.productId);
      // react-native-iap v14+ API - 需要嵌套在 request 裡
      if (Platform.OS === 'ios') {
        await requestPurchase({
          request: {
            apple: {
              sku: option.productId,
              quantity: 1,
              andDangerouslyFinishTransactionAutomatically: false,
            },
          },
        });
      } else {
        await requestPurchase({
          request: {
            google: {
              skus: [option.productId],
            },
          },
        });
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
              <View style={[styles.trialBadge, { backgroundColor: trialColors.bg }]}>
                <Ionicons name="time-outline" size={14} color={trialColors.icon} />
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>購買點數</Text>
            {isLoadingProducts && (
              <View style={styles.loadingBadge}>
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                <Text style={styles.loadingBadgeText}>載入中</Text>
              </View>
            )}
          </View>

          {/* 2x2 Grid */}
          <View style={styles.plansGrid}>
            <View style={styles.plansRow}>
              {RECHARGE_OPTIONS.slice(0, 2).map((option) => {
                const isProductLoaded = iapProducts.some((p) => p.id === option.productId);
                const isDisabled = isRecharging || isLoadingProducts;
                return (
                  <TouchableOpacity
                    key={option.points}
                    style={[
                      styles.planCard,
                      option.popular && styles.planCardPopular,
                      isDisabled && styles.planCardDisabled,
                    ]}
                    onPress={() => handleRecharge(option)}
                    disabled={isDisabled}
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
                        <Text style={[styles.planPoints, isDisabled && styles.planTextDisabled]}>{option.points}</Text>
                        <Text style={[styles.planPointsLabel, isDisabled && styles.planTextDisabled]}>點</Text>
                        <Text style={[styles.planPrice, isDisabled && styles.planTextDisabled]}>NT$ {option.price}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.plansRow}>
              {RECHARGE_OPTIONS.slice(2, 4).map((option) => {
                const isDisabled = isRecharging || isLoadingProducts;
                return (
                  <TouchableOpacity
                    key={option.points}
                    style={[
                      styles.planCard,
                      isDisabled && styles.planCardDisabled,
                    ]}
                    onPress={() => handleRecharge(option)}
                    disabled={isDisabled}
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
                        <Text style={[styles.planPoints, isDisabled && styles.planTextDisabled]}>{option.points}</Text>
                        <Text style={[styles.planPointsLabel, isDisabled && styles.planTextDisabled]}>點</Text>
                        <Text style={[styles.planPrice, isDisabled && styles.planTextDisabled]}>NT$ {option.price}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
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
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
    },
    loadingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.muted.DEFAULT,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    loadingBadgeText: {
      fontSize: 12,
      color: colors.text.secondary,
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
    planCardDisabled: {
      opacity: 0.6,
    },
    planTextDisabled: {
      opacity: 0.7,
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
