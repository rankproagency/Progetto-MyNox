import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { LogBox } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Il Supabase client logga questo errore internamente prima di emettere SIGNED_OUT.
// Il flusso è corretto (l'utente viene sloggato), ma l'overlay in dev è fuorviante.
LogBox.ignoreLogs(['AuthApiError: Invalid Refresh Token']);

WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  dateOfBirth?: string; // YYYY-MM-DD
}

interface AuthCtx {
  user: AuthUser | null;
  isOnboarded: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, dateOfBirth: Date) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  completeOnboarding: () => void;
  updateUser: (updates: Partial<Pick<AuthUser, 'name' | 'email'>>) => void;
  musicGenres: string[];
  setMusicGenres: (genres: string[]) => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  isOnboarded: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  logout: () => {},
  completeOnboarding: () => {},
  updateUser: () => {},
  musicGenres: [],
  setMusicGenres: () => {},
});

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  onboarded: '@mynox_onboarded',
  onboardedUid: '@mynox_onboarded_uid',
  genres: '@mynox_genres',
};

function sessionToUser(session: Session): AuthUser {
  return {
    id: session.user.id,
    name: session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? '',
    email: session.user.email ?? '',
    dateOfBirth: session.user.user_metadata?.birthdate ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [musicGenres, setMusicGenresState] = useState<string[]>([]);

  useEffect(() => {
    async function loadGenres() {
      try {
        const raw = await AsyncStorage.getItem(KEYS.genres);
        if (raw) setMusicGenresState(JSON.parse(raw));
      } catch (_) {}
    }
    loadGenres();

    // Risolve isOnboarded dal user_metadata Supabase, con fallback su AsyncStorage per utenti esistenti
    async function resolveOnboarded(session: Session) {
      const meta = session.user.user_metadata;
      if (meta?.onboarded === true) {
        setIsOnboarded(true);
      } else if (meta?.onboarded == null) {
        // Utente esistente senza flag — migra solo se il flag AsyncStorage appartiene a questo utente
        const raw = await AsyncStorage.getItem(KEYS.onboarded);
        const storedUid = await AsyncStorage.getItem(KEYS.onboardedUid);
        const local = raw === 'true' && storedUid === session.user.id;
        setIsOnboarded(local);
        if (local) supabase.auth.updateUser({ data: { onboarded: true } });
      } else {
        // onboarded = false esplicito → nuovo utente su dispositivo già usato
        setIsOnboarded(false);
      }
    }

    // Se il refresh token in cache è invalido, pulisci la sessione prima che Supabase
    // tenti il refresh automatico e loggi l'errore internamente.
    (async () => {
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error?.message?.toLowerCase().includes('refresh token')) {
          await supabase.auth.signOut();
        }
      } catch (_) {}
    })();

    // Fallback: se INITIAL_SESSION non scatta entro 3s (TLS issue), sblocca il routing
    const fallback = setTimeout(() => setIsLoading(false), 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        clearTimeout(fallback);
        if (!session) {
          setUser(null);
          const raw = await AsyncStorage.getItem(KEYS.onboarded);
          setIsOnboarded(raw === 'true');
          setIsLoading(false);
          return;
        }
        setUser(sessionToUser(session as any));
        await resolveOnboarded(session as any);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN') {
        setUser(session ? sessionToUser(session) : null);
        if (session) await resolveOnboarded(session);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        const raw = await AsyncStorage.getItem(KEYS.onboarded);
        setIsOnboarded(raw === 'true');
      }
    });

    return () => { subscription.unsubscribe(); clearTimeout(fallback); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('https://mynox-stripe-proxy.onrender.com/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.error || json.error_description) throw new Error(json.error_description ?? json.error ?? 'Errore login');
      await supabase.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, dateOfBirth: Date) => {
    setIsLoading(true);
    try {
      const birthdate = dateOfBirth.toISOString().split('T')[0]; // YYYY-MM-DD
      const res = await fetch('https://mynox-stripe-proxy.onrender.com/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, birthdate }),
      });
      const json = await res.json();
      if (json.error || json.error_description) throw new Error(json.error_description ?? json.error ?? 'Errore registrazione');
      if (json.access_token) {
        setIsOnboarded(false); // nuovo utente — forza onboarding senza aspettare il listener
        await supabase.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token });
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('profiles').update({ date_of_birth: birthdate }).eq('id', session.user.id);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'mynox', path: 'auth/callback' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw new Error(error?.message ?? 'Errore Google Sign-In');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (result.type === 'success') {
      const url = result.url;
      const code = new URL(url).searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw new Error(exchangeError.message);
        const { data: { session: gs } } = await supabase.auth.getSession();
        if (gs && gs.user.user_metadata?.onboarded !== true) {
          setIsOnboarded(false);
        }
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    setIsOnboarded(true);
    const { data: { session } } = await supabase.auth.getSession();
    await AsyncStorage.setItem(KEYS.onboarded, 'true');
    if (session) {
      await AsyncStorage.setItem(KEYS.onboardedUid, session.user.id);
      await supabase.auth.updateUser({ data: { onboarded: true } });
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<Pick<AuthUser, 'name' | 'email'>>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('profiles').update(updates).eq('id', session.user.id);
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  const setMusicGenres = useCallback(async (genres: string[]) => {
    setMusicGenresState(genres);
    await AsyncStorage.setItem(KEYS.genres, JSON.stringify(genres));
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').update({ music_genres: genres }).eq('id', session.user.id);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isOnboarded, isLoading,
      login, register, loginWithGoogle, logout, completeOnboarding,
      updateUser, musicGenres, setMusicGenres,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
