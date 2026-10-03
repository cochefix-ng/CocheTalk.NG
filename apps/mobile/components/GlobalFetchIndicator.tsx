import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { DottedCircleLoader } from './DottedCircleLoader';

export function GlobalFetchIndicator() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const isFetchingCount = useIsFetching();
  const isMutatingCount = useIsMutating();
  const { isSyncing } = useApp();

  const isBusy = (isFetchingCount > 0 || isMutatingCount > 0 || isSyncing);

  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: isBusy ? 1 : 0,
      duration: isBusy ? 200 : 350,
      useNativeDriver: true,
    }).start();
  }, [isBusy, opacityAnim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          top: insets.top > 0 ? insets.top + 6 : 10,
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: '#000',
          },
        ]}
      >
        <DottedCircleLoader size={16} color={colors.primary} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 14,
    zIndex: 9999,
  },
  badge: {
    padding: 5,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
});
