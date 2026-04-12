import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Profile {
  name: string;
  email: string;
  memberSince: string;
  eventsAttended: number;
  totalSpent: number;
}

interface ProfileCtx {
  profile: Profile;
  updateProfile: (updates: Partial<Pick<Profile, 'name' | 'email'>>) => void;
}

const DEFAULT_PROFILE: Profile = {
  name: 'Pietro Tortelotti',
  email: 'pietro@example.com',
  memberSince: 'Gennaio 2026',
  eventsAttended: 12,
  totalSpent: 187,
};

const ProfileContext = createContext<ProfileCtx>({
  profile: DEFAULT_PROFILE,
  updateProfile: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  const updateProfile = useCallback((updates: Partial<Pick<Profile, 'name' | 'email'>>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
