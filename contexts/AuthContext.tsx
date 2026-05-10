import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { LogBox, AppState } from 'react-native';
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
  updateDateOfBirth: (dob: Date) => Promise<void>;
  deleteAccount: () => Promise<void>;
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
  updateDateOfBirth: async () => {},
  deleteAccount: async () => {},
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
    // Carica i generi dal profilo Supabase dell'utente loggato.
    // Non usa AsyncStorage per evitare contaminazione tra utenti diversi sullo stesso dispositivo.
    async function loadUserGenres(userId: string) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('music_genres')
          .eq('id', userId)
          .maybeSingle();
        if (data?.music_genres) {
          setMusicGenresState(data.music_genres);
        } else {
          setMusicGenresState([]);
        }
      } catch (_) {}
    }

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

    // Valida la sessione contro il server: rileva utenti eliminati da Supabase.
    // getUser() fa sempre una chiamata di rete (a differenza di refreshSession che
    // può restituire la cache locale se il JWT non è ancora scaduto).
    // signOut({ scope: 'local' }) pulisce lo stato locale senza chiamare il server —
    // necessario perché se l'utente è eliminato, la chiamata server fallirebbe.
    async function forceSignOut() {
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null); // forza pulizia stato anche se SIGNED_OUT non propaga
    }

    async function validateSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Check 1: refreshSession() fa SEMPRE una chiamata di rete e il refresh token
        // viene invalidato da Supabase quando l'utente è eliminato da auth.users.
        // È il metodo più affidabile — a differenza di getUser() che può validare
        // il JWT per sola firma crittografica senza verificare il DB.
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) { await forceSignOut(); return; }

        // Check 2: getUser() contatta GoTrue per verificare che l'utente esista
        const { error: userError } = await supabase.auth.getUser();
        if (userError) { await forceSignOut(); return; }

        // Check 3: verifica che il profilo esista (CASCADE delete da auth.users)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!profile) await forceSignOut();
      } catch (_) {}
    }
    validateSession();

    // Ogni volta che l'app torna in foreground, rivalidia la sessione.
    // Questo rileva immediatamente utenti eliminati da Supabase mentre l'app era aperta.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') validateSession();
    });

    // Check periodico ogni 2 minuti mentre l'app è in uso.
    const sessionPoll = setInterval(validateSession, 2 * 60 * 1000);

    // Fallback: se INITIAL_SESSION non scatta entro 3s (TLS issue), sblocca il routing
    const fallback = setTimeout(() => setIsLoading(false), 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        clearTimeout(fallback);
        if (!session) {
          setUser(null);
          setMusicGenresState([]);
          const raw = await AsyncStorage.getItem(KEYS.onboarded);
          setIsOnboarded(raw === 'true');
          setIsLoading(false);
          return;
        }
        setUser(sessionToUser(session as any));
        await resolveOnboarded(session as any);
        await loadUserGenres(session.user.id);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN') {
        setUser(session ? sessionToUser(session) : null);
        if (session) {
          await resolveOnboarded(session);
          await loadUserGenres(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setMusicGenresState([]);
        await AsyncStorage.removeItem(KEYS.genres);
        const raw = await AsyncStorage.getItem(KEYS.onboarded);
        setIsOnboarded(raw === 'true');
      }
    });

    return () => { subscription.unsubscribe(); appStateSub.remove(); clearInterval(sessionPoll); clearTimeout(fallback); };
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

  const updateDateOfBirth = useCallback(async (dob: Date) => {
    const birthdate = dob.toISOString().split('T')[0];
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.auth.updateUser({ data: { birthdate } });
    await supabase.from('profiles').update({ date_of_birth: birthdate }).eq('id', session.user.id);
    setUser((prev) => prev ? { ...prev, dateOfBirth: birthdate } : prev);
  }, []);

  const deleteAccount = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch('https://mynox-stripe-proxy.onrender.com/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: session.access_token }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Errore eliminazione account');
    await supabase.auth.signOut();
    setUser(null);
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
      updateUser, updateDateOfBirth, deleteAccount, musicGenres, setMusicGenres,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
