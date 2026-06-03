import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Font } from '../../constants/typography';
import { useTranslation } from 'react-i18next';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 26,
          paddingTop: 10,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={60}
            tint="dark"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ),
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Font.semiBold,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color }) => <Ionicons name="search" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: t('tabs.tickets'),
          tabBarIcon: ({ color }) => <Ionicons name="ticket" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
