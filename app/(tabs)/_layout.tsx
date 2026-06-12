import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { collapsed, expand } = useTabBarCollapsed();

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

  return (
    <Animated.View style={[styles.outerContainer, { bottom: insets.bottom + 12, left: sideMargin, right: sideMargin }]}>
      <View style={styles.pill}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.row, { paddingVertical: rowPaddingVertical }]}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const tab = TAB_CONFIG[index];

            const onPress = () => {
              expand();
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <Animated.View style={[styles.tabItemInner, { paddingVertical: itemPaddingVertical }]}>
                  {isFocused && <View style={styles.activeHighlight} />}
                  <Ionicons
                    name={isFocused ? tab.activeIcon : tab.icon}
                    size={23}
                    color={isFocused ? Colors.accent : Colors.textMuted}
                  />
                </Animated.View>
              </TouchableOpacity>
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
  },
  activeHighlight: {
    position: 'absolute',
    width: 46,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentBgMid,
  },
});
