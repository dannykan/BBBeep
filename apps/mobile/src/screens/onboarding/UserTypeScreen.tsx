/**
 * User Type Screen (Step 1)
 * 選擇身份：汽車駕駛 / 機車騎士 / 行人
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTheme } from '../../context/ThemeContext';
import { OnboardingLayout, StepHeader } from './components';
import type { UserType, VehicleType } from '@bbbeeep/shared';
import {
  typography,
  spacing,
  borderRadius,
} from '../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'UserType'>;

export default function UserTypeScreen({ navigation }: Props) {
  const { setUserType, setVehicleType, setLicensePlate, getTotalSteps } = useOnboarding();
  const { colors } = useTheme();

  const handleSelect = (type: UserType, vehicle?: VehicleType) => {
    setUserType(type);
    if (vehicle) {
      setVehicleType(vehicle);
    } else {
      // 行人不需要車輛類型和車牌
      setVehicleType(null);
      setLicensePlate('');
    }

    // Pedestrians skip license plate step
    if (type === 'pedestrian') {
      navigation.navigate('Nickname');
    } else {
      navigation.navigate('LicensePlate');
    }
  };

  return (
    <OnboardingLayout
      currentStep={1}
      totalSteps={getTotalSteps() || 6}
      showBackButton={false}
    >
      <View style={styles.stepContent}>
        <StepHeader
          title="你今天是用什麼方式在路上？"
          subtitle="不同身分，能使用的功能會不一樣"
        />

        <View style={styles.userTypeOptions}>
          <TouchableOpacity
            style={[styles.userTypeOption, { borderColor: colors.border, backgroundColor: colors.card.DEFAULT }]}
            onPress={() => handleSelect('driver', 'car')}
            activeOpacity={0.7}
          >
            <View style={styles.userTypeContent}>
              <View style={styles.iconContainer}>
                <FontAwesome6 name="car" size={28} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.userTypeTextContainer}>
                <Text style={[styles.userTypeTitle, { color: colors.foreground }]}>汽車駕駛</Text>
                <Text style={[styles.userTypeDescription, { color: colors.muted.foreground }]}>
                  填寫車牌｜可以發送，也可以接收提醒
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.userTypeOption, { borderColor: colors.border, backgroundColor: colors.card.DEFAULT }]}
            onPress={() => handleSelect('driver', 'scooter')}
            activeOpacity={0.7}
          >
            <View style={styles.userTypeContent}>
              <View style={styles.iconContainer}>
                <FontAwesome6 name="motorcycle" size={28} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.userTypeTextContainer}>
                <Text style={[styles.userTypeTitle, { color: colors.foreground }]}>機車騎士</Text>
                <Text style={[styles.userTypeDescription, { color: colors.muted.foreground }]}>
                  填寫車牌｜可以發送，也可以接收提醒
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.userTypeOption, { borderColor: colors.border, backgroundColor: colors.card.DEFAULT }]}
            onPress={() => handleSelect('pedestrian')}
            activeOpacity={0.7}
          >
            <View style={styles.userTypeContent}>
              <View style={styles.iconContainer}>
                <View style={styles.dualIconContainer}>
                  <FontAwesome6 name="person-walking" size={20} color={colors.primary.DEFAULT} style={styles.iconTopLeft} />
                  <FontAwesome6 name="bicycle" size={20} color={colors.primary.DEFAULT} style={styles.iconBottomRight} />
                </View>
              </View>
              <View style={styles.userTypeTextContainer}>
                <Text style={[styles.userTypeTitle, { color: colors.foreground }]}>行人 / 腳踏車</Text>
                <Text style={[styles.userTypeDescription, { color: colors.muted.foreground }]}>
                  不需車牌｜只能發送提醒
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.muted.DEFAULT }]}>
          <Text style={[styles.infoText, { color: colors.muted.foreground }]}>
            行人 / 腳踏車沒有車牌，因此不會收到別人的提醒
          </Text>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  stepContent: {
    gap: spacing[6],
  },

  // User Type Options
  userTypeOptions: {
    gap: spacing[3],
  },
  userTypeOption: {
    padding: spacing[5],
    borderWidth: 2,
    borderRadius: borderRadius['2xl'],
  },
  userTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualIconContainer: {
    width: 40,
    height: 40,
    position: 'relative',
  },
  iconTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  iconBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  userTypeTextContainer: {
    flex: 1,
  },
  userTypeTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    marginBottom: spacing[1],
  },
  userTypeDescription: {
    fontSize: typography.fontSize.xs,
  },

  // Info Card
  infoCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
});
