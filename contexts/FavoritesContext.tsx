import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [eventIds, setEventIds] = useState<Set<string>>(new Set());
  const [clubs, setClubs] = useState<FavoriteClub[]>([]);

  const toggleFavorite = useCallback((id: string) => {
    setEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => eventIds.has(id), [eventIds]);

  const toggleFavoriteClub = useCallback((club: FavoriteClub) => {
    setClubs((prev) => {
      const exists = prev.some((c) => c.id === club.id);
      return exists ? prev.filter((c) => c.id !== club.id) : [...prev, club];
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
