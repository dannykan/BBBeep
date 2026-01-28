/**
 * Vehicle Icon Component
 * 統一車輛類型圖示：汽車、機車、行人/腳踏車
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import type { UserType, VehicleType } from '@bbbeeep/shared';

interface VehicleIconProps {
  userType?: UserType | null;
  vehicleType?: VehicleType | null;
  size?: number;
  color?: string;
}

export default function VehicleIcon({
  userType,
  vehicleType,
  size = 24,
  color = '#3B82F6',
}: VehicleIconProps) {
  // 行人/腳踏車：左上右下對角配置
  if (userType === 'pedestrian') {
    const iconSize = size * 0.6;
    return (
      <View style={[styles.dualContainer, { width: size, height: size }]}>
        <FontAwesome6
          name="person-walking"
          size={iconSize}
          color={color}
          style={styles.iconTopLeft}
        />
        <FontAwesome6
          name="bicycle"
          size={iconSize}
          color={color}
          style={styles.iconBottomRight}
        />
      </View>
    );
  }

  // 汽車
  if (vehicleType === 'car') {
    return <FontAwesome6 name="car" size={size} color={color} />;
  }

  // 機車（預設）
  return <FontAwesome6 name="motorcycle" size={size} color={color} />;
}

const styles = StyleSheet.create({
  dualContainer: {
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
});
