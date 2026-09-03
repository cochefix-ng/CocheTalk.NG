import { Feather } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Link, router } from 'expo-router';
import { useSSO, useSignIn } from '@clerk/expo';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const colors = useColors();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const isLoading = fetchStatus === 'fetching';

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const finishSignIn = useCallback(async () => {
    await signIn.finalize({
      navigate: async () => {
        router.replace('/(tabs)');
      },
    });
  }, [signIn]);

  const handleSubmit = async () => {
    if (!emailAddress.trim() || !password) return;
    setErrorMessage('');
    const { error } = await signIn.password({
      emailAddress: emailAddress.trim(),
      password,
    });

    if (error) {
      setErrorMessage(error.message || 'We could not sign you in. Check your details and try again.');
      return;
    }

    if (signIn.status === 'complete') {
      await finishSignIn();
    } else if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
      setErrorMessage('This account needs an additional verification step. Please try again from a trusted device.');
    } else {
      setErrorMessage('Sign-in needs another step. Please try again.');
    }
  };

  const handleGoogle = async () => {
    setErrorMessage('');
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'cochetalk', path: 'oauth-callback' }),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      } else {
        setErrorMessage('Google sign-in needs more information before it can finish.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Google sign-in was cancelled or failed.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <Feather name="truck" size={28} color="#fff" />
          </View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>CocheTalk.NG</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sign in to connect with car owners, mechanics and trusted service providers.
          </Text>

          <View style={styles.socialGroup}>
            <Pressable
              style={({ pressed }) => [styles.socialButton, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
              onPress={handleGoogle}
              disabled={isLoading}
            >
              <Text style={[styles.googleG, { color: '#4285F4' }]}>G</Text>
              <Text style={[styles.socialText, { color: colors.foreground }]}>Continue with Google</Text>
            </Pressable>
            <View style={[styles.socialButton, styles.disabledButton, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="facebook" size={19} color={colors.mutedForeground} />
              <Text style={[styles.socialText, { color: colors.mutedForeground }]}>Facebook unavailable</Text>
              <Text style={[styles.unavailableText, { color: colors.mutedForeground }]}>Soon</Text>
            </View>
          </View>

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or continue with email</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Email address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={emailAddress}
            onChangeText={setEmailAddress}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            textContentType="password"
          />

          {(errorMessage || errors.fields.identifier?.message || errors.fields.password?.message) && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {errorMessage || errors.fields.identifier?.message || errors.fields.password?.message}
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: emailAddress.trim() && password ? colors.primary : colors.muted },
              pressed && styles.pressed,
            ]}
            onPress={handleSubmit}
            disabled={!emailAddress.trim() || !password || isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryButtonText, { color: emailAddress.trim() && password ? '#fff' : colors.mutedForeground }]}>Sign in</Text>}
          </Pressable>

          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Don&apos;t have an account?{' '}
            <Link href="/(auth)/sign-up" style={[styles.link, { color: colors.primary }]}>Create one</Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, maxWidth: 520, width: '100%', alignSelf: 'center' },
  brandMark: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  brandName: { fontSize: 16, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3, marginBottom: 28 },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 26 },
  socialGroup: { gap: 10 },
  socialButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 10 },
  disabledButton: { opacity: 0.72 },
  socialText: { fontSize: 14, fontWeight: '600' },
  googleG: { fontSize: 20, fontWeight: '800' },
  unavailableText: { position: 'absolute', right: 14, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 24 },
  divider: { height: 1, flex: 1 },
  dividerText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 14 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  error: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  primaryButton: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  primaryButtonText: { fontSize: 16, fontWeight: '700' },
  footerText: { fontSize: 14, textAlign: 'center', marginTop: 22 },
  link: { fontWeight: '700' },
  pressed: { opacity: 0.78 },
});