import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

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
    async function init() {
      try {
        const [{ data: { session } }, rawOnboarded, rawGenres] = await Promise.all([
          supabase.auth.getSession(),
          AsyncStorage.getItem(KEYS.onboarded),
          AsyncStorage.getItem(KEYS.genres),
        ]);
        if (session) setUser(sessionToUser(session));
        if (rawOnboarded === 'true') setIsOnboarded(true);
        if (rawGenres) setMusicGenresState(JSON.parse(rawGenres));
      } catch (_) {
        // start fresh
      } finally {
        setIsLoading(false);
      }
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? sessionToUser(session) : null);
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
      login, register, logout, completeOnboarding,
      updateUser, musicGenres, setMusicGenres,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
