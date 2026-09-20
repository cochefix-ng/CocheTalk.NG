import { Feather } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { supabase } from '@/lib/supabase';
import { GoogleLogo } from '@/components/GoogleLogo';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const colors = useColors();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const handleSubmit = async () => {
    if (!emailAddress.trim() || !password) return;
    setErrorMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailAddress.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setErrorMessage('Please confirm your email before signing in, or disable "Confirm email" in Supabase Authentication settings.');
        } else {
          setErrorMessage(error.message || 'We could not sign you in. Check your details and try again.');
        }
        return;
      }

      if (data.session) {
        router.replace('/(tabs)');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'cochetalk', path: 'oauth-callback' });
      console.log('[Google Auth] Initiating OAuth with redirectTo:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        if (error.message.includes('not enabled') || error.message.includes('validation_failed')) {
          setErrorMessage('Google sign-in is not enabled in your Supabase project. Please enable Google under Authentication > Providers in your Supabase dashboard.');
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success' && result.url) {
          console.log('[Google Auth] Received callback URL:', result.url);

          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          let code: string | null = null;

          try {
            const parsedUrl = new URL(result.url);
            code = parsedUrl.searchParams.get('code');
            accessToken = parsedUrl.searchParams.get('access_token');
            refreshToken = parsedUrl.searchParams.get('refresh_token');

            if (parsedUrl.hash) {
              const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
              accessToken = accessToken || hashParams.get('access_token');
              refreshToken = refreshToken || hashParams.get('refresh_token');
              code = code || hashParams.get('code');
            }
          } catch {
            const queryIndex = result.url.indexOf('?');
            if (queryIndex !== -1) {
              const queryParams = new URLSearchParams(result.url.substring(queryIndex + 1).split('#')[0]);
              code = queryParams.get('code');
              accessToken = queryParams.get('access_token');
              refreshToken = queryParams.get('refresh_token');
            }
            const hashIndex = result.url.indexOf('#');
            if (hashIndex !== -1) {
              const hashParams = new URLSearchParams(result.url.substring(hashIndex + 1));
              accessToken = accessToken || hashParams.get('access_token');
              refreshToken = refreshToken || hashParams.get('refresh_token');
            }
          }

          if (code) {
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            if (!sessionError && sessionData.session) {
              router.replace('/(tabs)');
              return;
            } else if (sessionError) {
              setErrorMessage(sessionError.message);
              return;
            }
          }

          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!setSessionError) {
              router.replace('/(tabs)');
              return;
            }
          }
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Google sign-in was cancelled or failed.';
      if (msg.includes('not enabled') || msg.includes('validation_failed')) {
        setErrorMessage('Google sign-in is not enabled in your Supabase project. Enable Google in Supabase under Authentication > Providers.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
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
              <GoogleLogo size={20} />
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

          {!!errorMessage && (
            <Text style={[styles.error, { color: colors.destructiveText }]}>
              {errorMessage}
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
            {isLoading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryButtonText, { color: emailAddress.trim() && password ? colors.primaryForeground : colors.mutedForeground }]}>Sign in</Text>}
          </Pressable>

          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Don&apos;t have an account?{' '}
            <Link href="/(auth)/sign-up" style={[styles.link, { color: colors.primaryText }]}>Create one</Link>
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
  brandLogo: { width: 140, height: 140, alignSelf: 'center', marginBottom: 12, borderRadius: 20 },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 26 },
  socialGroup: { gap: 10 },
  socialButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 10 },
  disabledButton: { opacity: 0.72 },
  socialText: { fontSize: 14, fontWeight: '600' },
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