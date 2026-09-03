import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { useApp } from '@/context/AppContext';

const MESSAGES = [
  'Brake issue solved in 5 mins',
  'A mechanic just replied to a question',
  'New repair guide added',
  '3 car owners joined today',
  'Engine diagnosis completed',
  'Spare part found in Lagos',
  'Question answered in record time',
];

const LIGHT = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  primary: '#26d367',
  foreground: '#121212',
  muted: '#6B7280',
  border: '#E5E7EB',
};

const DARK = {
  bg: '#121212',
  card: '#1E1E1E',
  primary: '#26d367',
  foreground: '#F9FAFB',
  muted: '#9CA3AF',
  border: '#2A2A2A',
};

interface Props {
  onFinished: () => void;
}

const { width } = Dimensions.get('window');

export function CommunityLoader({ onFinished }: Props) {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? DARK : LIGHT;
  const { cmsConfig } = useApp();
  const loaderLogoUri = cmsConfig?.loaderLogoUri;

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const msgOpacity = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(1)).current;

  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  const msgIndexRef = useRef(msgIndex);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  const crossFadeTo = useCallback((nextIdx: number) => {
    Animated.timing(msgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      if (!isMounted.current) return;
      msgIndexRef.current = nextIdx;
      setMsgIndex(nextIdx);
      Animated.timing(msgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }, [msgOpacity]);

  useEffect(() => {
    isMounted.current = true;

    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start(() => {
      if (!isMounted.current) return;
      Animated.timing(msgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });

    const dotAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(dotScale, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    dotAnim.start();

    const msgInterval = setInterval(() => {
      if (!isMounted.current) return;
      const next = (msgIndexRef.current + 1) % MESSAGES.length;
      crossFadeTo(next);
    }, 700);
    intervalRef.current = msgInterval;

    const fadeOutTimer = setTimeout(() => {
      clearInterval(msgInterval);
      dotAnim.stop();
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }).start(() => {
        if (isMounted.current) onFinished();
      });
    }, 2500);

    return () => {
      isMounted.current = false;
      clearInterval(msgInterval);
      clearTimeout(fadeOutTimer);
      dotAnim.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[styles.overlay, { backgroundColor: c.bg, opacity: overlayOpacity }]}
      pointerEvents="none"
    >
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoContainer,
            { backgroundColor: c.primary + '22', borderColor: c.primary + '44' },
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          {loaderLogoUri ? (
            <Image
              source={{ uri: loaderLogoUri }}
              style={styles.logoImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.logoEmoji}>🔧</Text>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: logoOpacity, marginTop: 16 }}>
          <Text style={[styles.appName, { color: c.foreground }]}>CocheTalk</Text>
          <Text style={[styles.appTagline, { color: c.primary }]}>Nigeria's Vehicle Community</Text>
        </Animated.View>

        <View style={styles.messageArea}>
          <View style={[styles.messageCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Animated.View
              style={[
                styles.liveDot,
                { backgroundColor: c.primary, transform: [{ scale: dotScale }] },
              ]}
            />
            <Animated.Text
              style={[styles.messageText, { color: c.foreground, opacity: msgOpacity }]}
              numberOfLines={2}
            >
              {MESSAGES[msgIndex]}
            </Animated.Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: c.muted }]}>Loading your community…</Text>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: c.primary },
                {
                  opacity: overlayOpacity,
                  transform: [{ scale: i === 1 ? dotScale : new Animated.Value(1) }],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 48,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 40 },
  logoImage: { width: 64, height: 64, borderRadius: 14 },
  appName: { fontSize: 30, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  appTagline: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 4, letterSpacing: 0.2 },
  messageArea: { marginTop: 40, width: '100%', maxWidth: 320 },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  messageText: { fontSize: 14, fontWeight: '500', lineHeight: 20, flex: 1 },
  footer: { alignItems: 'center', gap: 10 },
  footerText: { fontSize: 12, fontWeight: '500', letterSpacing: 0.3 },
  dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
