import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Link, router } from 'expo-router';
import { useSSO, useSignUp } from '@clerk/expo';
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

const PENDING_ROLE_KEY = 'cochetalk_pending_signup_role';
const ACCOUNT_TYPES = [
  { value: 'Car Owner' as const, label: 'Car owner', icon: 'user' as const },
  { value: 'Service Provider' as const, label: 'Mechanic / service provider', icon: 'tool' as const },
];

export default function SignUpScreen() {
  const colors = useColors();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [name, setName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Car Owner' | 'Service Provider'>('Car Owner');
  const [code, setCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isLoading = fetchStatus === 'fetching';

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const finalizeSignUp = useCallback(async () => {
    await AsyncStorage.setItem(PENDING_ROLE_KEY, role);
    await signUp.finalize({
      navigate: async () => {
        router.replace('/(tabs)');
      },
    });
  }, [role, signUp]);

  const handleStart = async () => {
    if (!name.trim() || !emailAddress.trim() || !password) return;
    setErrorMessage('');
    const { error } = await signUp.password({
      emailAddress: emailAddress.trim(),
      password,
      firstName: name.trim(),
    });
    if (error) {
      setErrorMessage(error.message || 'We could not create your account. Please check your details.');
      return;
    }
    const { error: codeError } = await signUp.verifications.sendEmailCode();
    if (codeError) {
      setErrorMessage(codeError.message || 'We could not send the verification code.');
      return;
    }
    setVerificationSent(true);
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    setErrorMessage('');
    const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (error) {
      setErrorMessage(error.message || 'That verification code is not valid.');
      return;
    }
    if (signUp.status === 'complete') {
      await finalizeSignUp();
    } else {
      setErrorMessage('Your account needs another step before it can be completed.');
    }
  };

  const handleGoogle = async () => {
    setErrorMessage('');
    await AsyncStorage.setItem(PENDING_ROLE_KEY, role);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'cochetalk', path: 'oauth-callback' }),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      } else {
        setErrorMessage('Google sign-up needs more information before it can finish.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Google sign-up was cancelled or failed.');
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
          <Text style={[styles.title, { color: colors.foreground }]}>{verificationSent ? 'Verify your email' : 'Create your account'}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {verificationSent ? `Enter the code we sent to ${emailAddress}.` : 'Join the community for practical car advice and trusted automotive help.'}
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
                      <Text style={[styles.roleText, { color: selected ? colors.primary : colors.mutedForeground }]}>{accountType.label}</Text>
                      {selected && <Feather name="check-circle" size={16} color={colors.primary} />}
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
                <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or use email</Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </View>

              <Text style={[styles.label, { color: colors.foreground }]}>Full name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                textContentType="name"
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

              <Pressable
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: name.trim() && emailAddress.trim() && password ? colors.primary : colors.muted }, pressed && styles.pressed]}
                onPress={handleStart}
                disabled={!name.trim() || !emailAddress.trim() || !password || isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryButtonText, { color: name.trim() && emailAddress.trim() && password ? '#fff' : colors.mutedForeground }]}>Create account</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>Verification code</Text>
              <TextInput
                style={[styles.input, styles.codeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
              />
              <Pressable
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: code.trim() ? colors.primary : colors.muted }, pressed && styles.pressed]}
                onPress={handleVerify}
                disabled={!code.trim() || isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryButtonText, { color: code.trim() ? '#fff' : colors.mutedForeground }]}>Verify and continue</Text>}
              </Pressable>
              <Pressable style={styles.resendButton} onPress={() => signUp.verifications.sendEmailCode()} disabled={isLoading}>
                <Text style={[styles.resendText, { color: colors.primary }]}>Send a new code</Text>
              </Pressable>
              <Pressable style={styles.resendButton} onPress={() => { setVerificationSent(false); setCode(''); }} disabled={isLoading}>
                <Text style={[styles.resendText, { color: colors.mutedForeground }]}>Change email address</Text>
              </Pressable>
            </>
          )}

          <View nativeID="clerk-captcha" />
          {(errorMessage || errors.fields.emailAddress?.message || errors.fields.password?.message || errors.fields.code?.message) && (
            <Text style={[styles.error, { color: colors.destructive }]}>
              {errorMessage || errors.fields.emailAddress?.message || errors.fields.password?.message || errors.fields.code?.message}
            </Text>
          )}
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Already have an account?{' '}
            <Link href="/(auth)/sign-in" style={[styles.link, { color: colors.primary }]}>Sign in</Link>
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
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 7, marginTop: 14 },
  roleGroup: { gap: 9 },
  roleButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  roleText: { flex: 1, fontSize: 14, fontWeight: '600' },
  socialGroup: { gap: 10, marginTop: 18 },
  socialButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 10 },
  disabledButton: { opacity: 0.72 },
  socialText: { fontSize: 14, fontWeight: '600' },
  googleG: { fontSize: 20, fontWeight: '800' },
  unavailableText: { position: 'absolute', right: 14, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 22 },
  divider: { height: 1, flex: 1 },
  dividerText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  codeInput: { letterSpacing: 7, textAlign: 'center', fontSize: 20 },
  primaryButton: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  primaryButtonText: { fontSize: 16, fontWeight: '700' },
  resendButton: { alignItems: 'center', paddingVertical: 10 },
  resendText: { fontSize: 14, fontWeight: '600' },
  error: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  footerText: { fontSize: 14, textAlign: 'center', marginTop: 22 },
  link: { fontWeight: '700' },
  pressed: { opacity: 0.78 },
});