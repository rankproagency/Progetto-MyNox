import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Club } from '../types';

interface ClubsCtx {
  clubs: Club[];
  isLoading: boolean;
}

const ClubsContext = createContext<ClubsCtx>({ clubs: [], isLoading: true });

function rowToClub(row: any): Club {
  return {
    id: row.id,
    name: row.name,
    city: row.city ?? 'Padova',
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

  const loadClubs = useCallback(async () => {
    const { data } = await supabase
      .from('clubs')
      .select('id, name, city, address, image_url, instagram, tiktok, email, phone, latitude, longitude')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (data) setClubs(data.map(rowToClub));
    setIsLoading(false);
  }, []);

  useEffect(() => { loadClubs(); }, [loadClubs]);

  return (
    <ClubsContext.Provider value={{ clubs, isLoading }}>
      {children}
    </ClubsContext.Provider>
  );
}

export const useClubs = () => useContext(ClubsContext);
