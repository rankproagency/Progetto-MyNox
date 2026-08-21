import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Club } from '../types';

interface ClubsCtx {
  clubs: Club[];
  isLoading: boolean;
  error: string | null;
}

const ClubsContext = createContext<ClubsCtx>({ clubs: [], isLoading: true, error: null });

function rowToClub(row: any): Club {
  return {
    id: row.id,
    name: row.name,
    city: row.city ?? '',
    province: row.province ?? undefined,
    imageUrl: row.image_url ?? '',
    address: row.address ?? '',
    instagram: row.instagram ?? undefined,
    tiktok: row.tiktok ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
  };
}

export function ClubsProvider({ children }: { children: ReactNode }) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClubs = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('clubs')
      .select('id, name, city, province, address, image_url, instagram, tiktok, email, phone, latitude, longitude')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (fetchError) setError(fetchError.message);
    if (data) setClubs(data.map(rowToClub));
    setIsLoading(false);
  }, []);

  useEffect(() => { loadClubs(); }, [loadClubs]);

  return (
    <ClubsContext.Provider value={{ clubs, isLoading, error }}>
      {children}
    </ClubsContext.Provider>
  );
}

export const useClubs = () => useContext(ClubsContext);
