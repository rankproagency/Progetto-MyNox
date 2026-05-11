import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface FavoriteClub {
  id: string;
  name: string;
  imageUrl: string;
  city: string;
}

interface FavoritesCtx {
  favoriteIds: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  favoriteClubs: FavoriteClub[];
  isFavoriteClub: (id: string) => boolean;
  toggleFavoriteClub: (club: FavoriteClub) => void;
}

const FavoritesContext = createContext<FavoritesCtx>({
  favoriteIds: [],
  isFavorite: () => false,
  toggleFavorite: () => {},
  favoriteClubs: [],
  isFavoriteClub: () => false,
  toggleFavoriteClub: () => {},
});

// Chiavi specifiche per utente — nessuna contaminazione tra account diversi sullo stesso dispositivo
const userKeys = (uid: string) => ({
  events: `@mynox_fav_events_${uid}`,
  clubs: `@mynox_fav_clubs_${uid}`,
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [eventIds, setEventIds] = useState<Set<string>>(new Set());
  const [clubs, setClubs] = useState<FavoriteClub[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    async function loadForUser(userId: string) {
      const keys = userKeys(userId);
      const [eventsRaw, clubsRaw] = await Promise.all([
        AsyncStorage.getItem(keys.events),
        AsyncStorage.getItem(keys.clubs),
      ]);
      setEventIds(new Set(eventsRaw ? (JSON.parse(eventsRaw) as string[]) : []));
      setClubs(clubsRaw ? (JSON.parse(clubsRaw) as FavoriteClub[]) : []);
    }

    function clearAll() {
      setEventIds(new Set());
      setClubs([]);
      setUid(null);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user.id) {
          setUid(session.user.id);
          await loadForUser(session.user.id);
        } else {
          clearAll();
        }
      } else if (event === 'SIGNED_OUT') {
        clearAll();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    if (!uid) return;
    setEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem(userKeys(uid).events, JSON.stringify(Array.from(next)));
      return next;
    });
  }, [uid]);

  const isFavorite = useCallback((id: string) => eventIds.has(id), [eventIds]);

  const toggleFavoriteClub = useCallback((club: FavoriteClub) => {
    if (!uid) return;
    setClubs((prev) => {
      const exists = prev.some((c) => c.id === club.id);
      const next = exists ? prev.filter((c) => c.id !== club.id) : [...prev, club];
      AsyncStorage.setItem(userKeys(uid).clubs, JSON.stringify(next));
      return next;
    });
  }, [uid]);

  const isFavoriteClub = useCallback(
    (id: string) => clubs.some((c) => c.id === id),
    [clubs]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds: Array.from(eventIds),
        isFavorite,
        toggleFavorite,
        favoriteClubs: clubs,
        isFavoriteClub,
        toggleFavoriteClub,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
