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

const EN_TO_IT: Record<string, string> = {
  Jan: 'Gennaio', Feb: 'Febbraio', Mar: 'Marzo', Apr: 'Aprile',
  May: 'Maggio', Jun: 'Giugno', Jul: 'Luglio', Aug: 'Agosto',
  Sep: 'Settembre', Oct: 'Ottobre', Nov: 'Novembre', Dec: 'Dicembre',
};

const IT_MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function formatMemberSince(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    // Formato "Apr 2026" — già leggibile ma in inglese
    const shortMatch = raw.match(/^([A-Za-z]{3})\s+(\d{4})$/);
    if (shortMatch) {
      const it = EN_TO_IT[shortMatch[1]];
      return it ? `${it} ${shortMatch[2]}` : null;
    }

    // Formato ISO "2026-04-12T..."
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    const month = IT_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    if (!month || isNaN(year)) return null;
    return `${month} ${year}`;
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
