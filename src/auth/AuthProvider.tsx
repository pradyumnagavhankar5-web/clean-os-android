import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import type { User } from '@supabase/supabase-js';
import { CLOUD_CONFIG } from '../config/cloud';
import { parseAuthCallback } from './callback';
import { authErrorMessage } from './errors';
import { secureAuthStorage } from './secureStorage';
import { AUTH_STORAGE_KEY, supabase } from './supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  recovering: boolean;
  error: string;
  clearError: () => void;
  retrySession: () => Promise<void>;
  forgetSavedSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ confirmationRequired: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  finishRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function emailAddress(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Enter a valid email address.');
  return email;
}

function newPassword(value: string) {
  if (value.length < 10) throw new Error('Choose a password with at least 10 characters.');
  if (value.length > 128) throw new Error('Use a password with no more than 128 characters.');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState('');
  const authRevision = useRef(0);
  const active = useRef(true);
  const handledCodes = useRef(new Set<string>());

  const restoreSession = useCallback(async () => {
    const revision = authRevision.current;
    const { data, error: restoreError } = await supabase.auth.getSession();
    if (restoreError) throw new Error(authErrorMessage(restoreError));
    if (active.current && revision === authRevision.current) setUser(data.session?.user ?? null);
  }, []);

  const retrySession = useCallback(async () => {
    setLoading(true); setError('');
    try { await restoreSession(); }
    catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : authErrorMessage(cause)); }
    finally { if (active.current) setLoading(false); }
  }, [restoreSession]);

  useEffect(() => {
    active.current = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Keep this callback synchronous: awaiting another Auth method can block SDK callbacks.
      authRevision.current += 1;
      if (!active.current) return;
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    });
    void restoreSession().catch((cause) => {
      if (active.current) setError(cause instanceof Error ? cause.message : authErrorMessage(cause));
    }).finally(() => { if (active.current) setLoading(false); });

    function refreshForState(state: string | null | undefined) {
      if (state === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    }
    refreshForState(AppState.currentState);
    const lifecycle = AppState.addEventListener('change', refreshForState);

    async function receiveLink(url: string) {
      const callback = parseAuthCallback(url, CLOUD_CONFIG.redirectUrl);
      if (!callback) return;
      if (callback.failed) {
        if (active.current) setError('This email link has expired or is invalid. Request a new link and open it on this device.');
        return;
      }
      if (!callback.code || handledCodes.current.has(callback.code)) return;
      // Initial URL and URL event can describe the same one-use code.
      if (handledCodes.current.size >= 20) handledCodes.current.clear();
      handledCodes.current.add(callback.code);
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
        callback.code, callback.flowId ? { flowId: callback.flowId } : undefined,
      );
      if (exchangeError) { handledCodes.current.delete(callback.code); throw new Error(authErrorMessage(exchangeError)); }
      if (active.current) setError('');
    }
    const handleLink = (url: string) => { void receiveLink(url).catch((cause) => {
      if (active.current) setError(cause instanceof Error ? cause.message : authErrorMessage(cause));
    }); };
    const links = Linking.addEventListener('url', (event) => handleLink(event.url));
    void Linking.getInitialURL().then((url) => { if (url && active.current) handleLink(url); }).catch(() => {
      if (active.current) setError('The sign-in link could not be opened. Please try opening it again.');
    });
    return () => {
      active.current = false;
      listener.subscription.unsubscribe(); lifecycle.remove(); links.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, [restoreSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalized = emailAddress(email);
    if (!password) throw new Error('Enter your password.');
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (signInError) throw new Error(authErrorMessage(signInError));
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const normalized = emailAddress(email);
    newPassword(password);
    setError('');
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalized, password, options: { emailRedirectTo: CLOUD_CONFIG.redirectUrl },
    });
    if (signUpError) throw new Error(authErrorMessage(signUpError));
    return { confirmationRequired: data.session === null };
  }, []);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) throw new Error(authErrorMessage(signOutError));
    setUser(null); setRecovering(false); setError('');
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const normalized = emailAddress(email);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo: CLOUD_CONFIG.redirectUrl });
    if (resetError) throw new Error(authErrorMessage(resetError));
  }, []);

  const changePassword = useCallback(async (password: string) => {
    newPassword(password);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) throw new Error(authErrorMessage(updateError));
  }, []);

  const forgetSavedSession = useCallback(async () => {
    // Explicit recovery clears only local sign-in credentials; workspace records stay on the server.
    await secureAuthStorage.removeItem(AUTH_STORAGE_KEY);
    const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
    if (localError) throw new Error(authErrorMessage(localError));
    setUser(null); setRecovering(false); setError('');
  }, []);

  return <AuthContext.Provider value={{
    user, loading, recovering, error, clearError: () => setError(''), retrySession, forgetSavedSession,
    signIn, signUp, signOut, sendPasswordReset, changePassword, finishRecovery: () => setRecovering(false),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
