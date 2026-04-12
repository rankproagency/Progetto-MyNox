import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  isLoading: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  completeOnboarding: () => {},
  updateUser: () => {},
  musicGenres: [],
  setMusicGenres: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [musicGenres, setMusicGenres] = useState<string[]>([]);

  const login = useCallback(async (email: string, _password: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setUser({ id: 'mock-user-1', name: email.split('@')[0], email });
    setIsLoading(false);
  }, []);

  const register = useCallback(async (name: string, email: string, _password: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setUser({ id: 'mock-user-1', name, email });
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => setUser(null), []);
  const completeOnboarding = useCallback(() => setIsOnboarded(true), []);
  const updateUser = useCallback((updates: Partial<Pick<AuthUser, 'name' | 'email'>>) => {
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
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
