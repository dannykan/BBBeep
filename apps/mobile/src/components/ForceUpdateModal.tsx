import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface ForceUpdateModalProps {
  visible: boolean;
  updateUrl: string | null;
  updateMessage: string | null;
  currentVersion: string;
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  visible,
  updateUrl,
  updateMessage,
  currentVersion,
}) => {
  const { colors } = useTheme();

  const handleUpdate = () => {
    if (updateUrl) {
      Linking.openURL(updateUrl);
    } else {
      // 預設 App Store URL
      const defaultUrl =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/app/ubeep/id6740043498'
          : 'https://play.google.com/store/apps/details?id=com.ubeep.mobile';
      Linking.openURL(defaultUrl);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primary.bg },
            ]}
          >
            <Ionicons
              name="cloud-download-outline"
              size={64}
              color={colors.primary.DEFAULT}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            需要更新 App
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.muted.foreground }]}>
            {updateMessage || '有新版本可用，請更新以獲得最佳體驗和最新功能。'}
          </Text>

          {/* Version Info */}
          <View
            style={[
              styles.versionInfo,
              { backgroundColor: colors.muted.DEFAULT },
            ]}
          >
            <Text style={[styles.versionLabel, { color: colors.muted.foreground }]}>
              最新版本
            </Text>
            <Text style={[styles.versionText, { color: colors.foreground }]}>
              {currentVersion}
            </Text>
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: colors.primary.DEFAULT }]}
            onPress={handleUpdate}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up-circle" size={24} color="#FFFFFF" />
            <Text style={styles.updateButtonText}>前往更新</Text>
          </TouchableOpacity>

          {/* Note */}
          <Text style={[styles.note, { color: colors.muted.foreground }]}>
            更新後即可繼續使用 UBeep
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  versionLabel: {
    fontSize: 14,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    textAlign: 'center',
  },
});
