/**
 * Legal Screen
 * 相關條款頁面 - Warm Blue 設計
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

const TERMS_CONTENT = `服務條款

最後更新日期：2026 年 1 月

歡迎使用 UBeep 路上提醒平台（以下簡稱「本服務」）。在使用本服務前，請詳細閱讀以下條款。

1. 服務說明
UBeep 是一個讓用戶透過車牌號碼，以匿名且禮貌的方式向其他駕駛傳送提醒訊息的平台。

2. 使用規範
- 您同意僅使用本服務傳送善意的提醒訊息
- 禁止傳送任何騷擾、威脅、辱罵或不當內容
- 禁止使用本服務進行任何違法活動

3. 帳戶責任
- 您對您帳戶下的所有活動負責
- 請妥善保管您的帳戶資訊
- 如發現未經授權的使用，請立即通知我們

4. 隱私保護
您的隱私對我們非常重要，請參閱我們的隱私權政策了解詳情。

5. 點數與付款
- 點數一經購買，恕不退費
- 點數永久有效，無使用期限

6. 免責聲明
本服務僅提供訊息傳遞平台，不對訊息內容負責。

7. 服務變更
我們保留隨時修改或終止服務的權利。

8. 聯繫方式
如有任何問題，請透過 App 內的客服功能聯繫我們。`;

const PRIVACY_CONTENT = `隱私權政策

最後更新日期：2026 年 1 月

UBeep（以下簡稱「我們」）重視您的隱私。本政策說明我們如何收集、使用和保護您的個人資訊。

1. 資訊收集
我們可能收集以下資訊：
- 帳戶資訊：手機號碼、暱稱、車牌號碼
- 使用資訊：使用記錄、偏好設定
- 裝置資訊：裝置類型、作業系統版本

2. 資訊使用
我們使用收集的資訊來：
- 提供和改善服務
- 處理交易和傳送通知
- 防止欺詐和確保安全

3. 資訊分享
我們不會出售您的個人資訊。僅在以下情況分享：
- 取得您的同意
- 法律要求
- 保護權益所需

4. 車牌號碼
- 車牌號碼僅用於匹配提醒訊息
- 不會公開顯示或分享給第三方
- 您可以隨時更新或刪除

5. 資訊安全
我們採取適當的技術和組織措施保護您的資訊。

6. 您的權利
您有權：
- 存取和更正您的資訊
- 刪除您的帳戶
- 選擇退出行銷通訊

7. Cookie 和追蹤
我們使用 Cookie 來改善使用體驗。

8. 兒童隱私
本服務不適用於 13 歲以下兒童。

9. 政策更新
我們可能不時更新本政策，更新後會在 App 內通知。

10. 聯繫我們
如有隱私相關問題，請透過 App 內的客服功能聯繫我們。`;

type LegalType = 'terms' | 'privacy' | null;

interface LegalItem {
  type: 'terms' | 'privacy';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const legalItems: LegalItem[] = [
  {
    type: 'terms',
    label: '服務條款',
    icon: 'document-text',
  },
  {
    type: 'privacy',
    label: '隱私權政策',
    icon: 'shield-checkmark',
  },
];

export default function LegalScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedType, setSelectedType] = useState<LegalType>(null);

  const handleBack = () => {
    if (selectedType) {
      setSelectedType(null);
    } else {
      navigation.goBack();
    }
  };

  const getTitle = () => {
    if (selectedType === 'terms') return '服務條款';
    if (selectedType === 'privacy') return '隱私權政策';
    return '相關條款';
  };

  const getContent = () => {
    if (selectedType === 'terms') return TERMS_CONTENT;
    if (selectedType === 'privacy') return PRIVACY_CONTENT;
    return '';
  };

  // Detail view
  if (selectedType) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
                <Text style={styles.backText}>返回</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{getTitle()}</Text>
              <View style={styles.headerSpacer} />
            </View>
          </SafeAreaView>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>{getContent()}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // List view
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
              <Text style={styles.backText}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{getTitle()}</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.content}>
        {legalItems.map((item) => (
          <TouchableOpacity
            key={item.type}
            style={styles.itemCard}
            onPress={() => setSelectedType(item.type)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon} size={22} color={colors.primary.DEFAULT} />
            </View>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        ))}

        <View style={styles.spacer} />

        <Text style={styles.versionText}>UBeep v1.0.0</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    headerContainer: {
      backgroundColor: colors.background,
    },
    headerSafeArea: {
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 4,
    },
    backText: {
      fontSize: 14,
      color: colors.text.secondary,
      marginLeft: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 80,
    },

    // List Content
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 12,
    },

    // Item Card
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 64,
      paddingHorizontal: 16,
      gap: 12,
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primary.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.primary,
    },

    // Spacer and Version
    spacer: {
      flex: 1,
    },
    versionText: {
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: 'center',
    },

    // Detail Content
    scrollView: {
      flex: 1,
    },
    detailContent: {
      padding: 24,
    },
    contentCard: {
      backgroundColor: colors.card.DEFAULT,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    contentText: {
      fontSize: 14,
      color: colors.text.primary,
      lineHeight: 22,
    },
  });
