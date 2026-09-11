import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useFavorite, type FavoriteContentType } from '@/hooks/useFavorite';
import { useApp } from '@/context/AppContext';
import { router } from 'expo-router';

interface FavoriteButtonProps {
  contentType: FavoriteContentType;
  contentId: number;
  style?: any;
}

export function FavoriteButton({ contentType, contentId, style }: FavoriteButtonProps) {
  const colors = useColors();
  const { currentUser } = useApp();
  const { isFavorited, isLoading, toggleFavorite } = useFavorite(contentType, contentId);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when favorited
  const animatePulse = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const handlePress = () => {
    if (!currentUser) {
      router.push('/(auth)/sign-in');
      return;
    }
    if (!isFavorited) {
      animatePulse();
    }
    toggleFavorite();
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: isFavorited ? colors.primary + '22' : colors.muted },
        style
      ]}
      onPress={handlePress}
      disabled={isLoading && !isFavorited && !currentUser}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Feather
          name="bookmark"
          size={14}
          color={isFavorited ? colors.primary : colors.mutedForeground}
          style={isFavorited ? styles.filledIcon : undefined}
        />
      </Animated.View>
      <Text
        style={[
          styles.text,
          { color: isFavorited ? colors.primaryText : colors.mutedForeground }
        ]}
      >
        {isFavorited ? 'Saved' : 'Save'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  filledIcon: {
    // Fill approximation logic for feather bookmarks isn't perfect,
    // usually requires an SVG path change, but this provides color differentiation.
  }
});
