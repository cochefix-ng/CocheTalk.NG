import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const PENDING_ROLE_KEY = 'cochetalk_pending_signup_role';
const ACCOUNT_TYPES = [
  { value: 'Car Owner' as const, label: 'Car owner', icon: 'user' as const },
  { value: 'Service Provider' as const, label: 'Mechanic / service provider', icon: 'tool' as const },
];

export default function SignUpScreen() {
  const colors = useColors();
  const [name, setName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Car Owner' | 'Service Provider'>('Car Owner');
  const [code, setCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const handleStart = async () => {
    if (!name.trim() || !emailAddress.trim() || !password) return;
    setErrorMessage('');
    setInfoMessage('');
    setIsLoading(true);

    await AsyncStorage.setItem(PENDING_ROLE_KEY, role);

    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'cochetalk', path: 'oauth-callback' });
      const { data, error } = await supabase.auth.signUp({
        email: emailAddress.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name.trim(),
            role,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || 'We could not create your account. Please check your details.');
        return;
      }

      // If Supabase has "Confirm email" disabled, session is returned immediately
      if (data.session) {
        router.replace('/(tabs)');
      } else {
        // Confirmation required
        setVerificationSent(true);
        setInfoMessage(
          `We sent a confirmation to ${emailAddress.trim()}. Check your email and tap the confirmation link, or enter the 6-digit code if provided in the message.`
        );
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to register account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    setErrorMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailAddress.trim(),
        token: code.trim(),
        type: 'signup',
      });

      if (error) {
        setErrorMessage(error.message || 'That verification code is not valid. If you received a link instead, please click the link in your email.');
        return;
      }

      if (data.session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/sign-in');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'cochetalk', path: 'oauth-callback' });
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailAddress.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setInfoMessage('A new confirmation email has been sent. Check your inbox and spam folder.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not resend email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMessage('');
    setIsLoading(true);
    await AsyncStorage.setItem(PENDING_ROLE_KEY, role);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'cochetalk', path: 'oauth-callback' });
      console.log('[Google Auth Signup] Initiating OAuth with redirectTo:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        if (error.message.includes('not enabled') || error.message.includes('validation_failed')) {
          setErrorMessage('Google sign-up is not enabled in your Supabase dashboard. Enable Google under Authentication > Providers in Supabase.');
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success' && result.url) {
          console.log('[Google Auth Signup] Received callback URL:', result.url);

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
      const msg = error instanceof Error ? error.message : 'Google sign-up was cancelled or failed.';
      if (msg.includes('not enabled') || msg.includes('validation_failed')) {
        setErrorMessage('Google sign-up is not enabled in your Supabase dashboard. Enable Google under Authentication > Providers in Supabase.');
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
          <Text style={[styles.title, { color: colors.foreground }]}>{verificationSent ? 'Confirm your email' : 'Create your account'}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {verificationSent ? `Check your email sent to ${emailAddress}.` : 'Join the community for practical car advice and trusted automotive help.'}
          </Text>

          {!verificationSent ? (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>I am joining as a</Text>
              <View style={styles.roleGroup}>
                {ACCOUNT_TYPES.map((accountType) => {
                  const selected = role === accountType.value;
                  return (
                    <Pressable
                      key={accountType.value}
                      style={[styles.roleButton, { backgroundColor: selected ? colors.primary + '14' : colors.card, borderColor: selected ? colors.primary : colors.border }]}
                      onPress={() => setRole(accountType.value)}
                    >
                      <Feather name={accountType.icon} size={17} color={selected ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.roleText, { color: selected ? colors.primary : colors.foreground }]}>{accountType.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

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

              <Text style={[styles.label, { color: colors.foreground }]}>Full name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={name}
                onChangeText={setName}
                placeholder="Emeka Johnson"
                placeholderTextColor={colors.mutedForeground}
                autoCorrect={false}
              />

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
                placeholder="At least 8 characters"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                textContentType="newPassword"
              />
            </>
          ) : (
            <View style={styles.verificationContainer}>
              {!!infoMessage && (
                <View style={[styles.infoBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                  <Feather name="mail" size={20} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.foreground }]}>{infoMessage}</Text>
                </View>
              )}

              <Text style={[styles.label, { color: colors.foreground }]}>Enter code (if provided in email)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code (optional)"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
              />

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: code.trim() ? colors.primary : colors.muted },
                  pressed && styles.pressed,
                ]}
                onPress={handleVerify}
                disabled={!code.trim() || isLoading}
              >
                {isLoading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.primaryButtonText, { color: code.trim() ? colors.primaryForeground : colors.mutedForeground }]}>Verify code</Text>}
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.card }, pressed && styles.pressed]}
                onPress={() => router.replace('/(auth)/sign-in')}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>I&apos;ve verified via link &rarr; Sign in</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
                onPress={handleResend}
                disabled={isLoading}
              >
                <Text style={[styles.textButtonText, { color: colors.primaryText }]}>Resend confirmation email</Text>
              </Pressable>
            </View>
          )}

          {!!errorMessage && (
            <Text style={[styles.error, { color: colors.destructiveText }]}>{errorMessage}</Text>
          )}

          {!verificationSent && (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: name.trim() && emailAddress.trim() && password ? colors.primary : colors.muted },
                pressed && styles.pressed,
              ]}
              onPress={handleStart}
              disabled={!name.trim() || !emailAddress.trim() || !password || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: name.trim() && emailAddress.trim() && password ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  Create account
                </Text>
              )}
            </Pressable>
          )}

          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Already have an account?{' '}
            <Link href="/(auth)/sign-in" style={[styles.link, { color: colors.primaryText }]}>Sign in</Link>
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
  roleGroup: { gap: 10, marginBottom: 18 },
  roleButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  roleText: { fontSize: 14, fontWeight: '600' },
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
  infoBanner: { padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  verificationContainer: { gap: 8 },
  primaryButton: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryButtonText: { fontSize: 16, fontWeight: '700' },
  secondaryButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondaryButtonText: { fontSize: 14, fontWeight: '600' },
  textButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 4 },
  textButtonText: { fontSize: 14, fontWeight: '600' },
  footerText: { fontSize: 14, textAlign: 'center', marginTop: 22 },
  link: { fontWeight: '700' },
  pressed: { opacity: 0.78 },
});