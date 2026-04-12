import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const MAX_RECENT = 10;

interface RecentlyViewedCtx {
  recentIds: string[];
  addRecentlyViewed: (id: string) => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedCtx>({
  recentIds: [],
  addRecentlyViewed: () => {},
});

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const addRecentlyViewed = useCallback((id: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((r) => r !== id);
      return [id, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  return (
    <RecentlyViewedContext.Provider value={{ recentIds, addRecentlyViewed }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export const useRecentlyViewed = () => useContext(RecentlyViewedContext);
