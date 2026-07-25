import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, Animated, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useState, useEffect } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '../../constants/colors';
import { useTranslation } from 'react-i18next';
import { TabBarProvider, useTabBarCollapsed } from '../../contexts/TabBarContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: { icon: IoniconsName; activeIcon: IoniconsName }[] = [
  { icon: 'home-outline', activeIcon: 'home' },
  { icon: 'search-outline', activeIcon: 'search' },
  { icon: 'ticket-outline', activeIcon: 'ticket' },
  { icon: 'map-outline', activeIcon: 'map' },
  { icon: 'person-outline', activeIcon: 'person' },
];

const TAB_COUNT = TAB_CONFIG.length;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { collapsed, expand } = useTabBarCollapsed();

  // Stale closure fix: update refs synchronously in render body so PanResponder
  // callbacks always read the latest state/navigation without re-creating the responder.
  const stateRef = useRef(state);
  const navRef = useRef(navigation);
  stateRef.current = state;
  navRef.current = navigation;

  const rowRef = useRef<any>(null);
  const rowLayout = useRef({ x: 0, width: 0 });
  const lastMeasuredWidth = useRef(0);
  const [tabWidth, setTabWidth] = useState(0);
  const layoutReady = useRef(false);

  const indX = useRef(new Animated.Value(0)).current;
  const indScaleX = useRef(new Animated.Value(1)).current;
  const indScaleY = useRef(new Animated.Value(1)).current;

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  // Snap indicator when active tab changes externally (back gesture, deep link, etc.)
  useEffect(() => {
    if (!layoutReady.current || rowLayout.current.width === 0) return;
    const tw = rowLayout.current.width / TAB_COUNT;
    Animated.spring(indX, {
      toValue: state.index * tw,
      tension: 300,
      friction: 30,
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 3,

      onPanResponderGrant: () => {
        draggingRef.current = false;
        Animated.spring(indScaleX, { toValue: 1.25, tension: 400, friction: 20, useNativeDriver: true }).start();
        Animated.spring(indScaleY, { toValue: 0.80, tension: 400, friction: 20, useNativeDriver: true }).start();
      },

      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 6) draggingRef.current = true;
        if (!draggingRef.current) return;

        const { x: rowX, width: rowWidth } = rowLayout.current;
        const tw = rowWidth / TAB_COUNT;
        const newIdx = Math.max(0, Math.min(TAB_COUNT - 1, Math.floor((gs.moveX - rowX) / tw)));

        indX.setValue(newIdx * tw);

        if (dragIdxRef.current !== newIdx) {
          dragIdxRef.current = newIdx;
          setDragIdx(newIdx);
        }
      },

      onPanResponderRelease: (_, gs) => {
        const wasDragging = draggingRef.current;
        draggingRef.current = false;

        Animated.spring(indScaleX, { toValue: 1, tension: 400, friction: 20, useNativeDriver: true }).start();
        Animated.spring(indScaleY, { toValue: 1, tension: 400, friction: 20, useNativeDriver: true }).start();

        setDragIdx(null);
        dragIdxRef.current = null;

        const currentState = stateRef.current;
        const nav = navRef.current;
        const { x: rowX, width: rowWidth } = rowLayout.current;
        const tw = rowWidth / TAB_COUNT;

        if (!wasDragging) {
          // Tap: use the initial touch position (gs.x0) to identify the tab
          const tappedIdx = Math.max(0, Math.min(TAB_COUNT - 1, Math.floor((gs.x0 - rowX) / tw)));
          Animated.spring(indX, { toValue: tappedIdx * tw, tension: 300, friction: 30, useNativeDriver: true }).start();
          expand();
          if (tappedIdx !== currentState.index) {
            nav.navigate(currentState.routes[tappedIdx].name);
          }
          return;
        }

        // Drag release: snap to whatever tab the finger ended on
        const finalIdx = Math.max(0, Math.min(TAB_COUNT - 1, Math.floor((gs.moveX - rowX) / tw)));
        Animated.spring(indX, { toValue: finalIdx * tw, tension: 300, friction: 30, useNativeDriver: true }).start();
        expand();
        if (finalIdx !== currentState.index) {
          nav.navigate(currentState.routes[finalIdx].name);
        }
      },

      onPanResponderTerminate: () => {
        draggingRef.current = false;
        dragIdxRef.current = null;
        setDragIdx(null);
        Animated.spring(indScaleX, { toValue: 1, tension: 400, friction: 20, useNativeDriver: true }).start();
        Animated.spring(indScaleY, { toValue: 1, tension: 400, friction: 20, useNativeDriver: true }).start();
      },
    })
  ).current;

  const rowPaddingVertical = collapsed.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 3],
  });
  const itemPaddingVertical = collapsed.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 3],
  });
  const sideMargin = collapsed.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 44],
  });

  const activeIdx = dragIdx ?? state.index;

  return (
    <Animated.View style={[styles.outerContainer, { bottom: insets.bottom + 12, left: sideMargin, right: sideMargin }]}>
      <View style={styles.pill}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View
          ref={rowRef}
          style={[styles.row, { paddingVertical: rowPaddingVertical }]}
          onLayout={() => {
            rowRef.current?.measure((_: number, __: number, width: number, ___: number, pageX: number) => {
              // Only update when width actually changes to avoid thrashing on padding animations
              if (width === lastMeasuredWidth.current && layoutReady.current) return;
              lastMeasuredWidth.current = width;
              const tw = width / TAB_COUNT;
              rowLayout.current = { x: pageX, width };
              setTabWidth(tw);
              if (!layoutReady.current) {
                layoutReady.current = true;
                indX.setValue(stateRef.current.index * tw);
              }
            });
          }}
          {...panResponder.panHandlers}
        >
          {/* Sliding pill indicator — sits behind icons, follows finger in real-time */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: tabWidth,
                transform: [
                  { translateX: indX },
                  { scaleX: indScaleX },
                  { scaleY: indScaleY },
                ],
              },
            ]}
          />

          {state.routes.map((route, index) => {
            const isFocused = activeIdx === index;
            const tab = TAB_CONFIG[index];
            return (
              <View key={route.key} style={styles.tabItem}>
                <Animated.View style={[styles.tabItemInner, { paddingVertical: itemPaddingVertical }]}>
                  <Ionicons
                    name={isFocused ? tab.activeIcon : tab.icon}
                    size={23}
                    color={isFocused ? Colors.accent : Colors.textMuted}
                  />
                </Animated.View>
              </View>
            );
          })}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <TabBarProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="search" options={{ title: t('tabs.search') }} />
        <Tabs.Screen name="tickets" options={{ title: t('tabs.tickets') }} />
        <Tabs.Screen name="map" options={{ title: t('tabs.map') }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
      </Tabs>
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
  },
  pill: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  indicator: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 0,
    borderRadius: 14,
    backgroundColor: Colors.accentBgMid,
  },
});
