/**
 * GradientBackground Component
 * 使用 react-native-svg 實現漸層背景（支援 New Architecture）
 */

import React, { useState } from 'react';
import { View, ViewStyle, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

interface GradientBackgroundProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  children?: React.ReactNode;
  borderRadius?: number;
}

// Simple counter for unique IDs
let gradientCounter = 0;

export default function GradientBackground({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  children,
  borderRadius = 0,
}: GradientBackgroundProps) {
  // Generate unique ID for each gradient instance
  const [gradientId] = useState(() => `gradient-${++gradientCounter}`);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Convert 0-1 coordinates to percentage strings
  const x1 = `${start.x * 100}%`;
  const y1 = `${start.y * 100}%`;
  const x2 = `${end.x * 100}%`;
  const y2 = `${end.y * 100}%`;

  // Extract style properties
  const flatStyle = StyleSheet.flatten(style) || {};
  const { borderRadius: styleBorderRadius, ...restStyle } = flatStyle as any;
  const effectiveBorderRadius = borderRadius || styleBorderRadius || 0;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  return (
    <View
      style={[styles.container, { borderRadius: effectiveBorderRadius }, restStyle]}
      onLayout={handleLayout}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <View style={styles.svgWrapper} pointerEvents="none">
          <Svg width={dimensions.width} height={dimensions.height}>
            <Defs>
              <SvgLinearGradient id={gradientId} x1={x1} y1={y1} x2={x2} y2={y2}>
                {colors.map((color, index) => (
                  <Stop
                    key={index}
                    offset={`${(index / (colors.length - 1)) * 100}%`}
                    stopColor={color}
                    stopOpacity="1"
                  />
                ))}
              </SvgLinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={dimensions.width}
              height={dimensions.height}
              fill={`url(#${gradientId})`}
              rx={effectiveBorderRadius}
              ry={effectiveBorderRadius}
            />
          </Svg>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  svgWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
