import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface Profile {
  memberSince: string | null;
}

interface ProfileCtx {
  profile: Profile;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileCtx>({
  profile: { memberSince: null },
  isLoading: true,
});

function formatMemberSince(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const lang = require('../lib/i18n').default.language ?? 'it';
    const locale = lang === 'en' ? 'en-GB' : 'it-IT';

    const shortMatch = raw.match(/^([A-Za-z]{3})\s+(\d{4})$/);
    if (shortMatch) {
      const d = new Date(`${shortMatch[1]} 1 ${shortMatch[2]}`);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }

    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ memberSince: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data } = await supabase
        .from('profiles')
        .select('member_since')
        .eq('id', user.id)
        .single();

      const raw = data?.member_since ?? user.created_at ?? null;
      setProfile({ memberSince: formatMemberSince(raw) });
      setIsLoading(false);
    }

    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchProfile();
      else { setProfile({ memberSince: null }); setIsLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
