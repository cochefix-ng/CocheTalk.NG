import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { useColors } from '@/hooks/useColors';

export interface DottedCircleLoaderProps {
  /**
   * Size of the circular loader in pixels, or a preset ('small' = 20, 'medium' = 30, 'large' = 44).
   * Default is 'small' (20px).
   */
  size?: 'small' | 'medium' | 'large' | number;
  /**
   * Color of the dots. Defaults to `colors.primary`.
   */
  color?: string;
  /**
   * Number of dots around the circle. Defaults to 8 for small/medium, 10 for large.
   */
  dotCount?: number;
  /**
   * Duration of one full 360-degree rotation in milliseconds. Default is 800ms.
   */
  duration?: number;
  /**
   * Optional text label to display beside or beneath the loader.
   */
  label?: string;
  /**
   * Position of the label relative to the spinner ('right' | 'bottom'). Default is 'right'.
   */
  labelPosition?: 'right' | 'bottom';
  /**
   * Optional custom style for the label text.
   */
  labelStyle?: StyleProp<TextStyle>;
  /**
   * If true, centers the loader inside a flex: 1 container.
   */
  centered?: boolean;
  /**
   * Style applied to the outer container.
   */
  style?: StyleProp<ViewStyle>;
}

export function DottedCircleLoader({
  size = 'small',
  color,
  dotCount,
  duration = 800,
  label,
  labelPosition = 'right',
  labelStyle,
  centered = false,
  style,
}: DottedCircleLoaderProps) {
  const colors = useColors();
  const activeColor = color ?? colors.primary;

  const resolvedSize =
    typeof size === 'number'
      ? size
      : size === 'large'
      ? 44
      : size === 'medium'
      ? 30
      : 20;

  const resolvedDotCount =
    dotCount ?? (resolvedSize >= 40 ? 10 : 8);

  const dotDiameter = Math.max(2, Math.round(resolvedSize * 0.16));
  const radius = (resolvedSize - dotDiameter) / 2 - 0.5;
  const center = resolvedSize / 2;

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [duration, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate coordinates and gradient opacities for the dots
  const dots = Array.from({ length: resolvedDotCount }).map((_, i) => {
    const angle = (2 * Math.PI * i) / resolvedDotCount - Math.PI / 2;
    const x = center + radius * Math.cos(angle) - dotDiameter / 2;
    const y = center + radius * Math.sin(angle) - dotDiameter / 2;
    // Chasing opacity gradient from highest to lowest
    const opacity = 0.18 + 0.82 * (i / (resolvedDotCount - 1));
    return { x, y, opacity, key: i };
  });

  const spinner = (
    <Animated.View
      style={{
        width: resolvedSize,
        height: resolvedSize,
        transform: [{ rotate: spin }],
      }}
    >
      {dots.map((dot) => (
        <View
          key={dot.key}
          style={{
            position: 'absolute',
            left: dot.x,
            top: dot.y,
            width: dotDiameter,
            height: dotDiameter,
            borderRadius: dotDiameter / 2,
            backgroundColor: activeColor,
            opacity: dot.opacity,
          }}
        />
      ))}
    </Animated.View>
  );

  if (!label) {
    if (centered) {
      return <View style={[styles.centeredContainer, style]}>{spinner}</View>;
    }
    return <View style={style}>{spinner}</View>;
  }

  const isBottom = labelPosition === 'bottom';

  const content = (
    <View
      style={[
        isBottom ? styles.columnLayout : styles.rowLayout,
        centered && styles.centeredContainer,
        style,
      ]}
    >
      {spinner}
      <Text
        style={[
          styles.label,
          {
            color: colors.mutedForeground,
            marginLeft: isBottom ? 0 : 8,
            marginTop: isBottom ? 8 : 0,
            fontSize: resolvedSize >= 30 ? 14 : 12,
          },
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );

  return content;
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  columnLayout: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  label: {
    fontWeight: '500',
  },
});
