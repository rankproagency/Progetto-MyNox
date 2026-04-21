import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FavoriteClub {
  id: string;
  name: string;
  imageUrl: string;
  city: string;
}

interface FavoritesCtx {
  // Eventi
  favoriteIds: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  // Club
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

const KEYS = {
  events: '@mynox_fav_events',
  clubs: '@mynox_fav_clubs',
};

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [eventIds, setEventIds] = useState<Set<string>>(new Set());
  const [clubs, setClubs] = useState<FavoriteClub[]>([]);

  useEffect(() => {
    (async () => {
      const [eventsRaw, clubsRaw] = await Promise.all([
        AsyncStorage.getItem(KEYS.events),
        AsyncStorage.getItem(KEYS.clubs),
      ]);
      if (eventsRaw) setEventIds(new Set(JSON.parse(eventsRaw) as string[]));
      if (clubsRaw) setClubs(JSON.parse(clubsRaw) as FavoriteClub[]);
    })();
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem(KEYS.events, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => eventIds.has(id), [eventIds]);

  const toggleFavoriteClub = useCallback((club: FavoriteClub) => {
    setClubs((prev) => {
      const exists = prev.some((c) => c.id === club.id);
      const next = exists ? prev.filter((c) => c.id !== club.id) : [...prev, club];
      AsyncStorage.setItem(KEYS.clubs, JSON.stringify(next));
      return next;
    });
  }, []);

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
