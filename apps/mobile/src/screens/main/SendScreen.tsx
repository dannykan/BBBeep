/**
 * Send Screen
 * 發送提醒頁面 - 對齊 Web 版本設計（多步驟流程）
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import VehicleIcon from '../../components/VehicleIcon';
import { useNavigation } from '@react-navigation/native';
import { messagesApi, aiApi, normalizeLicensePlate, displayLicensePlate, getTotalPoints } from '@bbbeeep/shared';
import type { MessageType } from '@bbbeeep/shared';
import { useAuth } from '../../context/AuthContext';
import {
  VehicleType,
  getSituationsByVehicleType,
  getMessageByVehicleType,
  formatPlateNumber,
  getPlatePlaceholder,
  getVehicleTypeName,
} from '../../data/vehicleTemplates';
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type ReminderCategory = '車況提醒' | '行車安全' | '讚美感謝' | '其他情況';
type SendStep = 'vehicle-type' | 'plate-input' | 'category' | 'situation' | 'review' | 'custom' | 'ai-suggest' | 'confirm' | 'success';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - spacing[6] * 2 - spacing[4]) / 2;

export default function SendScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();

  // Step management
  const [step, setStep] = useState<SendStep>('vehicle-type');

  // Data
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [targetPlate, setTargetPlate] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReminderCategory | null>(null);
  const [selectedSituation, setSelectedSituation] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [customText, setCustomText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [useAiVersion, setUseAiVersion] = useState(false);
  const [usedAi, setUsedAi] = useState(false);
  const [aiLimit, setAiLimit] = useState({ canUse: true, remaining: 5 });

  // Location and time
  const [location, setLocation] = useState('');
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [selectedTimeOption, setSelectedTimeOption] = useState<'now' | '5min' | '10min' | '15min'>('now');

  // Loading states
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAiLimit();
  }, []);

  const checkAiLimit = async () => {
    try {
      const limit = await aiApi.checkLimit();
      setAiLimit(limit);
    } catch (error) {
      console.error('Failed to check AI limit:', error);
    }
  };

  // Calculate step progress
  const getStepProgress = (): { current: number; total: number } => {
    const totalSteps = 5;
    switch (step) {
      case 'vehicle-type':
        return { current: 1, total: totalSteps };
      case 'plate-input':
        return { current: 2, total: totalSteps };
      case 'category':
        return { current: 3, total: totalSteps };
      case 'situation':
      case 'review':
      case 'custom':
      case 'ai-suggest':
        return { current: 4, total: totalSteps };
      case 'confirm':
        return { current: 5, total: totalSteps };
      case 'success':
        return { current: 5, total: totalSteps };
      default:
        return { current: 1, total: totalSteps };
    }
  };

  const stepProgress = getStepProgress();

  // Calculate point cost
  const getPointCost = (): number => {
    // 其他讚美：有文字用AI改寫2點，不用AI 4點
    if (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise') {
      if (useAiVersion && usedAi) return 2;
      if (customText) return 4;
      return 0;
    }
    // 其他讚美選項：直接送出0點
    if (selectedCategory === '讚美感謝') return 0;
    if (selectedCategory === '其他情況') {
      return useAiVersion && usedAi ? 2 : 4;
    }
    if (!customText) return 1; // 只用系統生成
    if (useAiVersion && usedAi) return 2; // 補充文字 + AI
    return 4; // 補充文字 + 不用AI
  };

  const canAfford = (cost: number) => (getTotalPoints(user)) >= cost;

  // Handle time option selection
  const handleTimeOptionSelect = (option: 'now' | '5min' | '10min' | '15min') => {
    setSelectedTimeOption(option);
    const now = new Date();
    switch (option) {
      case 'now':
        setOccurredAt(now);
        break;
      case '5min':
        setOccurredAt(new Date(now.getTime() - 5 * 60 * 1000));
        break;
      case '10min':
        setOccurredAt(new Date(now.getTime() - 10 * 60 * 1000));
        break;
      case '15min':
        setOccurredAt(new Date(now.getTime() - 15 * 60 * 1000));
        break;
    }
  };

  // Format time display
  const formatOccurredTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / (60 * 1000));
    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `今天 ${hours}:${minutes}`;
  };

  // Step handlers
  const handleVehicleTypeSelect = (type: VehicleType) => {
    setVehicleType(type);
    setStep('plate-input');
  };

  const handlePlateSubmit = () => {
    if (!vehicleType) return;
    const formatted = normalizeLicensePlate(plateInput);
    if (!formatted) {
      Alert.alert('錯誤', '請輸入正確的車牌格式');
      return;
    }
    setTargetPlate(formatted);
    setStep('category');
  };

  const handleCategorySelect = (category: ReminderCategory) => {
    setSelectedCategory(category);
    setSelectedSituation('');
    setGeneratedMessage('');
    setCustomText('');
    setAiSuggestion('');
    setUseAiVersion(false);
    setUsedAi(false);

    if (category === '其他情況') {
      setStep('custom');
    } else {
      setStep('situation');
    }
  };

  const handleSituationSelect = (situationId: string) => {
    if (!vehicleType) return;
    setSelectedSituation(situationId);

    // 其他讚美：直接進入輸入界面
    if (selectedCategory === '讚美感謝' && situationId === 'other-praise') {
      setGeneratedMessage('');
      setStep('custom');
      return;
    }

    const message = getMessageByVehicleType(vehicleType, situationId);
    setGeneratedMessage(message);
    setStep('review');
  };

  const handleAddCustomText = async () => {
    if (!customText.trim()) {
      setStep('confirm');
      return;
    }

    // 驗證字數
    if (customText.trim().length < 5) {
      Alert.alert('錯誤', '補充文字至少需要 5 個字');
      return;
    }

    // 讚美感謝（非其他讚美）直接確認
    if (selectedCategory === '讚美感謝' && selectedSituation !== 'other-praise') {
      setStep('confirm');
      return;
    }

    // 有補充文字 → AI改寫
    if (aiLimit.canUse && customText.trim()) {
      setIsLoading(true);
      try {
        const textToRewrite = (selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise'))
          ? customText
          : `${generatedMessage} ${customText}`;
        const result = await aiApi.rewrite(textToRewrite, vehicleType || undefined, selectedCategory || undefined);
        setAiSuggestion(result.rewritten);
        setUsedAi(true);
        await checkAiLimit();
        setStep('ai-suggest');
      } catch (error: any) {
        Alert.alert('錯誤', error.response?.data?.message || 'AI 改寫失敗');
        setStep('confirm');
      } finally {
        setIsLoading(false);
      }
    } else {
      setStep('confirm');
    }
  };

  const handleConfirm = async () => {
    const cost = getPointCost();
    if (!canAfford(cost)) {
      Alert.alert('點數不足', '請先儲值', [
        { text: '取消', style: 'cancel' },
        { text: '去儲值', onPress: () => navigation.navigate('Wallet') },
      ]);
      return;
    }

    if (!selectedCategory || !targetPlate) {
      Alert.alert('錯誤', '請完成所有步驟');
      return;
    }

    // 驗證事發地點
    if (!location.trim()) {
      Alert.alert('錯誤', '請填寫事發地點');
      return;
    }

    const isOtherCase = selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise');
    if (!isOtherCase && !generatedMessage) {
      Alert.alert('錯誤', '請完成所有步驟');
      return;
    }

    if (isOtherCase && (!customText.trim() || customText.trim().length < 5)) {
      Alert.alert('錯誤', '說明內容至少需要 5 個字');
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPlate = normalizeLicensePlate(targetPlate);
      if (!normalizedPlate) {
        Alert.alert('錯誤', '車牌號碼格式無效');
        setIsLoading(false);
        return;
      }

      await messagesApi.create({
        licensePlate: normalizedPlate,
        type: selectedCategory === '其他情況' ? '行車安全提醒' : (selectedCategory === '行車安全' ? '行車安全提醒' : (selectedCategory as MessageType)),
        template: isOtherCase ? customText : (generatedMessage || customText),
        customText: isOtherCase ? undefined : (customText || undefined),
        useAiRewrite: usedAi,
        location: location || undefined,
        occurredAt: occurredAt.toISOString(),
      });

      try {
        const resetResult = await aiApi.resetLimit();
        setAiLimit(resetResult);
      } catch (error) {
        console.error('Failed to reset AI limit:', error);
      }

      await refreshUser();
      setStep('success');
    } catch (error: any) {
      Alert.alert('錯誤', error.response?.data?.message || '發送失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const stepFlow: Record<SendStep, SendStep | null> = {
      'vehicle-type': null,
      'plate-input': 'vehicle-type',
      'category': 'plate-input',
      'situation': 'category',
      'review': 'situation',
      'custom': selectedCategory === '其他情況'
        ? 'category'
        : (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise')
          ? 'situation'
          : 'review',
      'ai-suggest': 'custom',
      'confirm': aiSuggestion ? 'ai-suggest' : (customText ? 'custom' : 'review'),
      'success': null,
    };

    const prevStep = stepFlow[step];
    if (prevStep) {
      setStep(prevStep);
    } else if (step === 'vehicle-type') {
      navigation.goBack();
    }
  };

  const resetAll = () => {
    setStep('vehicle-type');
    setVehicleType(null);
    setTargetPlate('');
    setPlateInput('');
    setSelectedCategory(null);
    setSelectedSituation('');
    setGeneratedMessage('');
    setCustomText('');
    setAiSuggestion('');
    setUseAiVersion(false);
    setUsedAi(false);
    setLocation('');
    setOccurredAt(new Date());
    setSelectedTimeOption('now');
  };

  // Render step progress indicator
  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: stepProgress.total }, (_, i) => i + 1).map((s) => (
        <View
          key={s}
          style={[
            styles.progressDot,
            s === stepProgress.current && styles.progressDotActive,
            s < stepProgress.current && styles.progressDotCompleted,
          ]}
        />
      ))}
    </View>
  );

  // Render vehicle type step
  const renderVehicleTypeStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>對方是什麼車種？</Text>
        <Text style={styles.stepSubtitle}>先選擇車種，提醒會更精準</Text>
      </View>

      <View style={styles.vehicleGrid}>
        <TouchableOpacity
          style={styles.vehicleCard}
          onPress={() => handleVehicleTypeSelect('car')}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="car" size={56} color={colors.primary.DEFAULT} />
          <Text style={styles.vehicleCardText}>汽車</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.vehicleCard}
          onPress={() => handleVehicleTypeSelect('scooter')}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="motorcycle" size={56} color={colors.primary.DEFAULT} />
          <Text style={styles.vehicleCardText}>機車</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render plate input step
  const renderPlateInputStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>請輸入對方的車牌號碼</Text>
        <Text style={styles.stepSubtitle}>這樣才能把提醒送給對方</Text>
      </View>

      {/* Vehicle type badge */}
      <View style={styles.vehicleBadge}>
        <FontAwesome6
          name={vehicleType === 'car' ? 'car' : 'motorcycle'}
          size={14}
          color={colors.primary.DEFAULT}
        />
        <Text style={styles.vehicleBadgeText}>{getVehicleTypeName(vehicleType!)}</Text>
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>車牌號碼</Text>
        <TextInput
          style={styles.plateInput}
          value={plateInput}
          onChangeText={(text) => setPlateInput(formatPlateNumber(text))}
          placeholder={getPlatePlaceholder(vehicleType!)}
          placeholderTextColor={colors.muted.foreground}
          autoCapitalize="characters"
          maxLength={10}
        />
        <Text style={styles.inputHint}>僅用於投遞提醒，不會公開顯示</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, (!plateInput || plateInput.length < 4) && styles.buttonDisabled]}
        onPress={handlePlateSubmit}
        disabled={!plateInput || plateInput.length < 4}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>下一步</Text>
      </TouchableOpacity>
    </View>
  );

  // Render category step
  const renderCategoryStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>選擇情境</Text>
        <Text style={styles.stepSubtitle}>你要提醒什麼？</Text>
      </View>

      {/* Target info badge */}
      <View style={styles.targetBadge}>
        <Ionicons
          name={vehicleType === 'car' ? 'car' : 'bicycle'}
          size={14}
          color={colors.muted.foreground}
        />
        <Text style={styles.targetBadgeText}>
          對象：{getVehicleTypeName(vehicleType!)} {displayLicensePlate(targetPlate)}
        </Text>
      </View>

      {/* Category grid */}
      <View style={styles.categoryGrid}>
        <TouchableOpacity
          style={styles.categoryCard}
          onPress={() => handleCategorySelect('車況提醒')}
          activeOpacity={0.7}
        >
          <FontAwesome6
            name={vehicleType === 'car' ? 'car' : 'motorcycle'}
            size={40}
            color="#7A8FA8"
          />
          <Text style={styles.categoryCardText}>車況提醒</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryCard}
          onPress={() => handleCategorySelect('行車安全')}
          activeOpacity={0.7}
        >
          <Ionicons name="warning-outline" size={48} color="#E6A23C" />
          <Text style={styles.categoryCardText}>行車安全</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryCard}
          onPress={() => handleCategorySelect('讚美感謝')}
          activeOpacity={0.7}
        >
          <Ionicons name="thumbs-up-outline" size={48} color="#8FA6BF" />
          <Text style={styles.categoryCardText}>讚美感謝</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryCard}
          onPress={() => handleCategorySelect('其他情況')}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={48} color={colors.muted.foreground} />
          <Text style={styles.categoryCardText}>其他情況</Text>
        </TouchableOpacity>
      </View>

      {/* Points info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>車況/安全（系統模板）</Text>
          <Text style={styles.infoValue}>1 點</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>補充文字（AI協助）</Text>
          <Text style={styles.infoValue}>2 點</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>補充文字（不用AI）</Text>
          <Text style={styles.infoValue}>4 點</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>讚美感謝</Text>
          <Text style={[styles.infoValue, styles.infoValueFree]}>免費</Text>
        </View>
      </View>
    </View>
  );

  // Render situation step
  const renderSituationStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>
          {selectedCategory === '讚美感謝' ? '你想表達的是？' : '你要提醒的是？'}
        </Text>
        <Text style={styles.stepSubtitle}>選一個最接近的情況</Text>
      </View>

      {/* Context badge */}
      <View style={styles.targetBadge}>
        <Ionicons
          name={vehicleType === 'car' ? 'car' : 'bicycle'}
          size={14}
          color={colors.muted.foreground}
        />
        <Text style={styles.targetBadgeText}>
          {getVehicleTypeName(vehicleType!)} - {selectedCategory}
        </Text>
      </View>

      {/* Situation chips */}
      <View style={styles.situationGrid}>
        {getSituationsByVehicleType(vehicleType!, selectedCategory!).map((situation) => (
          <TouchableOpacity
            key={situation.id}
            style={[
              styles.situationChip,
              selectedSituation === situation.id && styles.situationChipSelected,
            ]}
            onPress={() => handleSituationSelect(situation.id)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.situationChipText,
              selectedSituation === situation.id && styles.situationChipTextSelected,
            ]}>
              {situation.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render review step
  const renderReviewStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>系統已生成</Text>
        <Text style={styles.stepSubtitle}>
          {selectedCategory === '讚美感謝' ? '預設使用這個訊息（免費）' : '預設使用這個訊息（1點）'}
        </Text>
      </View>

      {/* Context badge */}
      <View style={styles.targetBadge}>
        <Ionicons
          name={vehicleType === 'car' ? 'car' : 'bicycle'}
          size={14}
          color={colors.muted.foreground}
        />
        <Text style={styles.targetBadgeText}>
          {getVehicleTypeName(vehicleType!)} - {selectedCategory}
        </Text>
      </View>

      {/* Generated message */}
      <View style={styles.messageCard}>
        <Ionicons name="sparkles" size={20} color={colors.muted.foreground} />
        <Text style={styles.messageText}>{generatedMessage}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonGroup}>
        {selectedCategory === '讚美感謝' ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setStep('confirm')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>下一步（免費）</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                if (canAfford(1)) {
                  setStep('confirm');
                } else {
                  Alert.alert('點數不足', '請先儲值');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>下一步（1 點）</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep('custom')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>我想補充一句（2-4 點）</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Points info */}
      {selectedCategory !== '讚美感謝' && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>只用系統生成</Text>
            <Text style={styles.infoValue}>1 點</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>補充文字（AI協助）</Text>
            <Text style={styles.infoValue}>2 點</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>補充文字（不用AI）</Text>
            <Text style={styles.infoValue}>4 點</Text>
          </View>
        </View>
      )}
    </View>
  );

  // Render custom text step
  const renderCustomStep = () => {
    const isOtherCase = selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise');

    return (
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>
            {isOtherCase ? '請簡單說明' : '想補充一句'}
          </Text>
          <Text style={styles.stepSubtitle}>
            {isOtherCase ? '5-30字' : '可選，5-30字'}
          </Text>
        </View>

        {/* Show generated message if exists */}
        {generatedMessage && !isOtherCase && (
          <View style={styles.messageCardMuted}>
            <Text style={styles.messageCardLabel}>系統生成</Text>
            <Text style={styles.messageCardText}>{generatedMessage}</Text>
          </View>
        )}

        {/* Custom text input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            {isOtherCase ? '說明內容' : '補充說明'}
          </Text>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              value={customText}
              onChangeText={(text) => setCustomText(text.slice(0, 30))}
              placeholder={isOtherCase ? '例如：擋到出口了' : '例如：快到學校了'}
              placeholderTextColor={colors.muted.foreground}
              maxLength={30}
            />
            <Text style={[
              styles.charCount,
              customText.length < 5 && customText.length > 0 && styles.charCountError,
            ]}>
              {customText.length}/30
            </Text>
          </View>
        </View>

        {/* AI limit info */}
        {(selectedCategory !== '讚美感謝' || isOtherCase) && customText.trim() && (
          <View style={styles.aiInfoCard}>
            <View style={styles.aiInfoRow}>
              <Ionicons name="sparkles" size={16} color={colors.primary.DEFAULT} />
              <Text style={styles.aiInfoText}>AI 協助改寫</Text>
            </View>
            {aiLimit.canUse ? (
              <Text style={styles.aiInfoLimit}>今日剩餘 {aiLimit.remaining}/5 次</Text>
            ) : (
              <Text style={styles.aiInfoLimitExhausted}>今日已用完</Text>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.buttonGroup}>
          {!customText.trim() ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAddCustomText}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>下一步</Text>
            </TouchableOpacity>
          ) : customText.trim().length < 5 ? (
            <View style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Ionicons name="alert-circle" size={16} color={colors.destructive.DEFAULT} />
                <Text style={styles.errorTitle}>字數不足</Text>
              </View>
              <Text style={styles.errorText}>補充文字至少需要 5 個字</Text>
            </View>
          ) : (
            <>
              {(selectedCategory !== '讚美感謝' || isOtherCase) && (
                aiLimit.canUse ? (
                  <TouchableOpacity
                    style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                    onPress={handleAddCustomText}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={colors.primary.foreground} />
                    ) : (
                      <Text style={styles.primaryButtonText}>AI 協助改寫（1 點）</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.errorCard}>
                    <View style={styles.errorHeader}>
                      <Ionicons name="alert-circle" size={16} color={colors.destructive.DEFAULT} />
                      <Text style={styles.errorTitle}>AI 已達今日上限</Text>
                    </View>
                    <Text style={styles.errorText}>每日限制 5 次，明天會自動重置</Text>
                  </View>
                )
              )}

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  if (canAfford(4)) {
                    setStep('confirm');
                  } else {
                    Alert.alert('點數不足', '請先儲值');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>不用 AI，下一步（4 點）</Text>
              </TouchableOpacity>
            </>
          )}

          {!isOtherCase && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep('review')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>返回</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render AI suggest step
  const renderAiSuggestStep = () => {
    const isOtherCase = selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise');

    return (
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>AI 建議版本</Text>
          <Text style={styles.stepSubtitle}>這樣說會更清楚</Text>
        </View>

        {/* Original version */}
        <View style={styles.messageSection}>
          <Text style={styles.messageSectionLabel}>原本的版本</Text>
          <View style={styles.messageCardMuted}>
            <Text style={[styles.messageCardText, styles.textStrikethrough]}>
              {isOtherCase
                ? customText
                : `${generatedMessage}${customText ? `\n${customText}` : ''}`
              }
            </Text>
          </View>
        </View>

        {/* AI suggested version */}
        <View style={styles.messageSection}>
          <Text style={styles.messageSectionLabel}>AI 建議版本</Text>
          <View style={styles.messageCardHighlight}>
            <Ionicons name="sparkles" size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.messageText}>{aiSuggestion}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (canAfford(2)) {
                setUseAiVersion(true);
                setStep('confirm');
              } else {
                Alert.alert('點數不足', '請先儲值');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>用建議版送（2 點）</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              if (canAfford(4)) {
                setUseAiVersion(false);
                setStep('confirm');
              } else {
                Alert.alert('點數不足', '請先儲值');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>用原版送出（4 點）</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render confirm step
  const renderConfirmStep = () => {
    const isOtherCase = selectedCategory === '其他情況' || (selectedCategory === '讚美感謝' && selectedSituation === 'other-praise');
    const finalMessage = useAiVersion
      ? aiSuggestion
      : isOtherCase
        ? customText
        : (customText ? `${generatedMessage}\n${customText}` : generatedMessage);

    return (
      <View style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>確認送出</Text>
          <Text style={styles.stepSubtitle}>檢查一下內容</Text>
        </View>

        {/* Target info */}
        <View style={styles.targetBadge}>
          <Ionicons
            name={vehicleType === 'car' ? 'car' : 'bicycle'}
            size={14}
            color={colors.muted.foreground}
          />
          <Text style={styles.targetBadgeText}>
            {getVehicleTypeName(vehicleType!)} {displayLicensePlate(targetPlate)}
          </Text>
        </View>

        {/* Final message preview */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{selectedCategory}</Text>
          <Text style={styles.cardText}>{finalMessage}</Text>
        </View>

        {/* Location input */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={16} color={colors.muted.foreground} />
            <Text style={styles.cardHeaderText}>事發地點</Text>
            <Text style={styles.requiredBadge}>*必填</Text>
          </View>
          <Text style={styles.cardHint}>位置越準確，對方越容易回想起當時情況</Text>
          <TextInput
            style={styles.locationInput}
            value={location}
            onChangeText={setLocation}
            placeholder="輸入地址、路口或地標名稱"
            placeholderTextColor={colors.muted.foreground}
            maxLength={200}
          />
          {!location && (
            <Text style={styles.locationHint}>例如：信義路五段、台北101附近、全家便利商店前</Text>
          )}
        </View>

        {/* Time selection */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <Ionicons name="time-outline" size={16} color={colors.muted.foreground} />
              <Text style={styles.cardHeaderText}>事發時間</Text>
            </View>
            <Text style={styles.cardHeaderValue}>{formatOccurredTime(occurredAt)}</Text>
          </View>
          <View style={styles.timeButtonsGrid}>
            {(['now', '5min', '10min', '15min'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.timeButton,
                  selectedTimeOption === option && styles.timeButtonSelected,
                ]}
                onPress={() => handleTimeOptionSelect(option)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.timeButtonText,
                  selectedTimeOption === option && styles.timeButtonTextSelected,
                ]}>
                  {option === 'now' ? '剛剛' : option === '5min' ? '5分鐘前' : option === '10min' ? '10分鐘前' : '15分鐘前'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Point cost */}
        <View style={styles.costCard}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>本次消耗</Text>
            <View style={styles.costValueContainer}>
              <Text style={styles.costValue}>{getPointCost()}</Text>
              <Text style={styles.costUnit}>點</Text>
            </View>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costRow}>
            <Text style={styles.costRemainingLabel}>送出後剩餘</Text>
            <Text style={styles.costRemainingValue}>{(getTotalPoints(user)) - getPointCost()} 點</Text>
          </View>
        </View>

        {/* Warning if location not filled */}
        {!location.trim() && (
          <View style={styles.warningCard}>
            <Ionicons name="alert-circle" size={16} color="#D97706" />
            <Text style={styles.warningText}>請先填寫事發地點</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.buttonGroup}>
          {canAfford(getPointCost()) ? (
            <TouchableOpacity
              style={[styles.primaryButton, (isLoading || !location.trim()) && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={isLoading || !location.trim()}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primary.foreground} />
              ) : (
                <Text style={styles.primaryButtonText}>確認送出</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Ionicons name="alert-circle" size={16} color={colors.destructive.DEFAULT} />
                <Text style={styles.errorTitle}>點數不足</Text>
              </View>
              <Text style={styles.errorText}>
                目前剩餘 {getTotalPoints(user)} 點，需要 {getPointCost()} 點才能發送
              </Text>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => navigation.navigate('Wallet')}
                activeOpacity={0.8}
              >
                <Text style={styles.smallButtonText}>去儲值</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>返回修改</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render success step
  const renderSuccessStep = () => (
    <View style={styles.successContent}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={48} color="#16A34A" />
      </View>

      <Text style={styles.successTitle}>提醒已送出</Text>
      <Text style={styles.successSubtitle}>
        已成功送出給「{getVehicleTypeName(vehicleType!)}」車主
      </Text>

      <View style={styles.remainingPointsCard}>
        <Text style={styles.remainingPointsLabel}>剩餘點數</Text>
        <Text style={styles.remainingPointsValue}>{getTotalPoints(user)}</Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>返回首頁</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={resetAll}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>繼續發送</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (step) {
      case 'vehicle-type':
        return renderVehicleTypeStep();
      case 'plate-input':
        return renderPlateInputStep();
      case 'category':
        return renderCategoryStep();
      case 'situation':
        return renderSituationStep();
      case 'review':
        return renderReviewStep();
      case 'custom':
        return renderCustomStep();
      case 'ai-suggest':
        return renderAiSuggestStep();
      case 'confirm':
        return renderConfirmStep();
      case 'success':
        return renderSuccessStep();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={step === 'success' ? () => navigation.navigate('Home') : handleBack}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.muted.foreground}
              />
              <Text style={styles.backText}>
                {step === 'success' ? '完成' : '返回'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {step === 'success'
                ? '送出成功'
                : `發送提醒 (${stepProgress.current}/${stepProgress.total})`
              }
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      {/* Progress indicator */}
      {step !== 'success' && renderProgressIndicator()}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderBottomColor: colors.border,
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
    zIndex: 1,
  },
  backText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
    marginLeft: spacing[1],
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 80,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    width: 32,
    backgroundColor: colors.primary.DEFAULT,
  },
  progressDotCompleted: {
    backgroundColor: `${colors.primary.DEFAULT}80`,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[6],
  },
  stepContent: {
    gap: spacing[6],
  },
  stepHeader: {
    alignItems: 'center',
    gap: spacing[2],
  },
  stepTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  stepSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },

  // Vehicle type step
  vehicleGrid: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  vehicleCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.card.DEFAULT,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  vehicleCardText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },

  // Badge
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary.soft,
    borderWidth: 1,
    borderColor: `${colors.primary.DEFAULT}30`,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  vehicleBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: `${colors.muted.DEFAULT}30`,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  targetBadgeText: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },

  // Input section
  inputSection: {
    gap: spacing[2],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },
  plateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize.lg,
    fontFamily: 'monospace',
    color: colors.foreground,
    backgroundColor: colors.card.DEFAULT,
    textAlign: 'center',
    letterSpacing: 2,
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    textAlign: 'center',
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  categoryCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: colors.card.DEFAULT,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  categoryCardText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },

  // Situation grid
  situationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  situationChip: {
    width: (SCREEN_WIDTH - spacing[6] * 2 - spacing[3]) / 2,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card.DEFAULT,
    alignItems: 'center',
  },
  situationChipSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.soft,
  },
  situationChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  situationChipTextSelected: {
    color: colors.primary.DEFAULT,
  },

  // Message card
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: `${colors.muted.DEFAULT}30`,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
  },
  messageText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  messageCardMuted: {
    backgroundColor: `${colors.muted.DEFAULT}30`,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  messageCardLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },
  messageCardText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  messageCardHighlight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.primary.soft,
    borderWidth: 1,
    borderColor: `${colors.primary.DEFAULT}30`,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
  },
  textStrikethrough: {
    textDecorationLine: 'line-through',
    color: colors.muted.foreground,
  },
  messageSection: {
    gap: spacing[2],
  },
  messageSectionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },

  // Text input
  textInputContainer: {
    position: 'relative',
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    paddingRight: spacing[12],
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    backgroundColor: colors.card.DEFAULT,
  },
  charCount: {
    position: 'absolute',
    right: spacing[3],
    top: '50%',
    transform: [{ translateY: -8 }],
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },
  charCountError: {
    color: colors.destructive.DEFAULT,
  },

  // AI info card
  aiInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary.soft,
    borderWidth: 1,
    borderColor: `${colors.primary.DEFAULT}30`,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  aiInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  aiInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  aiInfoLimit: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.primary.DEFAULT,
  },
  aiInfoLimitExhausted: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.destructive.DEFAULT,
  },

  // Cards
  card: {
    backgroundColor: colors.card.DEFAULT,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  cardHeaderValue: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },
  cardLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },
  cardText: {
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  cardHint: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
    marginLeft: spacing[6],
  },
  requiredBadge: {
    fontSize: typography.fontSize.xs,
    color: colors.destructive.DEFAULT,
  },

  // Location input
  locationInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  locationHint: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },

  // Time buttons
  timeButtonsGrid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  timeButton: {
    flex: 1,
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.muted.DEFAULT}50`,
    alignItems: 'center',
  },
  timeButtonSelected: {
    backgroundColor: colors.primary.DEFAULT,
  },
  timeButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  timeButtonTextSelected: {
    color: colors.primary.foreground,
  },

  // Cost card
  costCard: {
    backgroundColor: `${colors.muted.DEFAULT}30`,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  costLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },
  costValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[1],
  },
  costValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: colors.primary.dark,
  },
  costUnit: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },
  costDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing[2],
  },
  costRemainingLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },
  costRemainingValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },

  // Warning card
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: '#92400E',
  },

  // Error card
  errorCard: {
    backgroundColor: `${colors.destructive.DEFAULT}10`,
    borderWidth: 1,
    borderColor: `${colors.destructive.DEFAULT}20`,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  errorTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.destructive.DEFAULT,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },

  // Info card
  infoCard: {
    backgroundColor: `${colors.muted.DEFAULT}30`,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.muted.foreground,
  },
  infoValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  infoValueFree: {
    color: '#16A34A',
  },

  // Buttons
  buttonGroup: {
    gap: spacing[3],
  },
  primaryButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.primary.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  secondaryButton: {
    backgroundColor: colors.card.DEFAULT,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
  },
  smallButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    alignSelf: 'flex-start',
  },
  smallButtonText: {
    color: colors.primary.foreground,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Success step
  successContent: {
    alignItems: 'center',
    paddingVertical: spacing[12],
    gap: spacing[6],
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.medium as any,
    color: colors.foreground,
  },
  successSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.muted.foreground,
  },
  remainingPointsCard: {
    backgroundColor: `${colors.muted.DEFAULT}30`,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[1],
    width: '100%',
  },
  remainingPointsLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.muted.foreground,
  },
  remainingPointsValue: {
    fontSize: 36,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.primary.dark,
  },
});
