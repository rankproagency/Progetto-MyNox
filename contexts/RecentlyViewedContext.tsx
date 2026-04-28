import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const MAX_RECENT = 10;

interface RecentlyViewedCtx {
  recentIds: string[];
  addRecentlyViewed: (id: string) => void;
  removeRecentlyViewed: (id: string) => void;
  clearRecentlyViewed: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedCtx>({
  recentIds: [],
  addRecentlyViewed: () => {},
  removeRecentlyViewed: () => {},
  clearRecentlyViewed: () => {},
});

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const addRecentlyViewed = useCallback((id: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((r) => r !== id);
      return [id, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  const removeRecentlyViewed = useCallback((id: string) => {
    setRecentIds((prev) => prev.filter((r) => r !== id));
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentIds([]);
  }, []);

  return (
    <RecentlyViewedContext.Provider value={{ recentIds, addRecentlyViewed, removeRecentlyViewed, clearRecentlyViewed }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export const useRecentlyViewed = () => useContext(RecentlyViewedContext);
