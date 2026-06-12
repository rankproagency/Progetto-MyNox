import { createContext, useContext, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface TabBarContextValue {
  collapsed: Animated.Value;
  expand: () => void;
  collapse: () => void;
}

const TabBarContext = createContext<TabBarContextValue | null>(null);

function useTabBarCtx(): TabBarContextValue {
  const ctx = useContext(TabBarContext);
  if (!ctx) throw new Error('TabBarContext not found');
  return ctx;
}

export function TabBarProvider({ children }: { children: React.ReactNode }) {
  const collapsed = useRef(new Animated.Value(0)).current;

  const expand = useCallback(() => {
    Animated.spring(collapsed, {
      toValue: 0,
      useNativeDriver: false,
      tension: 120,
      friction: 14,
    }).start();
  }, [collapsed]);

  const collapse = useCallback(() => {
    Animated.spring(collapsed, {
      toValue: 1,
      useNativeDriver: false,
      tension: 120,
      friction: 14,
    }).start();
  }, [collapsed]);

  return (
    <TabBarContext.Provider value={{ collapsed, expand, collapse }}>
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBarCollapsed() {
  return useTabBarCtx();
}

export function useTabBarScroll() {
  const { expand, collapse } = useTabBarCtx();
  const lastY = useRef(0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (y <= 20) {
        expand();
      } else if (y > lastY.current + 8) {
        collapse();
      } else if (y < lastY.current - 8) {
        expand();
      }
      lastY.current = y;
    },
    [expand, collapse]
  );

  return { onScroll };
}
