import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthCtx {
  user: AuthUser | null;
  isOnboarded: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
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
  genres: '@mynox_genres',
};

function sessionToUser(session: Session): AuthUser {
  return {
    id: session.user.id,
    name: session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? '',
    email: session.user.email ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [musicGenres, setMusicGenresState] = useState<string[]>([]);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const [rawOnboarded, rawGenres] = await Promise.all([
          AsyncStorage.getItem(KEYS.onboarded),
          AsyncStorage.getItem(KEYS.genres),
        ]);
        if (rawOnboarded === 'true') setIsOnboarded(true);
        if (rawGenres) setMusicGenresState(JSON.parse(rawGenres));
      } catch (_) {}
    }
    loadPrefs();

    // INITIAL_SESSION si triggera quando Supabase ha letto la sessione
    // da AsyncStorage — è il momento giusto per sbloccare il routing
    // Se il refresh token è scaduto, pulisce la sessione silenziosamente
    supabase.auth.getSession().then(({ error }) => {
      if (error?.message?.toLowerCase().includes('refresh token')) {
        supabase.auth.signOut();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session ? sessionToUser(session) : null);
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        setIsLoading(false);
      }
      if (event === 'INITIAL_SESSION' && !session) {
        setIsLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setIsLoading(false);
    if (error) throw new Error(error.message);
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
    await AsyncStorage.setItem(KEYS.onboarded, 'true');
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
