import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  primaryEmailAddress?: { emailAddress: string };
  user_metadata?: Record<string, any>;
}

interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AuthUser | null;
  session: Session | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<Session | null>;
}

const SupabaseAuthContext = createContext<AuthContextType | null>(null);

function mapSupabaseUser(user: SupabaseUser | null): AuthUser | null {
  if (!user) return null;
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata?.last_name || ''}`.trim() : '') ||
    user.email?.split('@')[0] ||
    '';
  const firstName = user.user_metadata?.first_name || fullName.split(' ')[0] || '';

  return {
    id: user.id,
    email: user.email,
    fullName,
    firstName,
    primaryEmailAddress: user.email ? { emailAddress: user.email } : undefined,
    user_metadata: user.user_metadata,
  };
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setIsLoaded(true);
    }).catch((err) => {
      console.warn('Error fetching initial Supabase session:', err);
      setIsLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsLoaded(true);
    });

    const handleAuthUrl = async (url: string) => {
      try {
        let code: string | null = null;
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        try {
          const parsed = new URL(url);
          code = parsed.searchParams.get('code');
          accessToken = parsed.searchParams.get('access_token');
          refreshToken = parsed.searchParams.get('refresh_token');

          if (parsed.hash) {
            const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
            code = code || hashParams.get('code');
            accessToken = accessToken || hashParams.get('access_token');
            refreshToken = refreshToken || hashParams.get('refresh_token');
          }
        } catch {
          const qIdx = url.indexOf('?');
          if (qIdx !== -1) {
            const qParams = new URLSearchParams(url.substring(qIdx + 1).split('#')[0]);
            code = qParams.get('code');
            accessToken = qParams.get('access_token');
            refreshToken = qParams.get('refresh_token');
          }
          const hIdx = url.indexOf('#');
          if (hIdx !== -1) {
            const hParams = new URLSearchParams(url.substring(hIdx + 1));
            code = code || hParams.get('code');
            accessToken = accessToken || hParams.get('access_token');
            refreshToken = refreshToken || hParams.get('refresh_token');
          }
        }

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      } catch (err) {
        console.warn('Failed to parse incoming auth URL:', err);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      handleAuthUrl(url);
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!session) {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    }
    return session.access_token;
  }, [session]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    setSession(null);
    return { error };
  }, []);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      setSession(data.session);
      return data.session;
    }
    return null;
  }, []);

  const user = useMemo(() => mapSupabaseUser(session?.user ?? null), [session]);
  const isSignedIn = !!session?.user;

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn,
      user,
      session,
      getToken,
      signOut,
      refreshSession,
    }),
    [isLoaded, isSignedIn, user, session, getToken, signOut, refreshSession]
  );

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    getToken: context.getToken,
    signOut: context.signOut,
    refreshSession: context.refreshSession,
  };
}

export function useUser() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useUser must be used within a SupabaseAuthProvider');
  }
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: context.user,
  };
}
