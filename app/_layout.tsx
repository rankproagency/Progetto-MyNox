import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { TicketsProvider } from '../contexts/TicketsContext';
import { ProfileProvider } from '../contexts/ProfileContext';
import { WaitlistProvider } from '../contexts/WaitlistContext';
import { RecentlyViewedProvider } from '../contexts/RecentlyViewedContext';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from '../hooks/useNotifications';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  DMSans_900Black,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <ProfileProvider>
        <TicketsProvider>
          <WaitlistProvider>
            <FavoritesProvider>
              <RecentlyViewedProvider>
                <RootNavigator />
              </RecentlyViewedProvider>
            </FavoritesProvider>
          </WaitlistProvider>
        </TicketsProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { user, isOnboarded } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    requestNotificationPermission();
    setReady(true);

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { route?: string };
      if (data?.route) {
        router.push(data.route as Parameters<typeof router.push>[0]);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;

    const authScreens = ['onboarding', 'login', 'register'];
    const inAuthScreen = authScreens.includes(segments[0] as string);

    if (!isOnboarded && !inAuthScreen) {
      router.replace('/onboarding');
    } else if (isOnboarded && !user && !inAuthScreen) {
      router.replace('/login');
    } else if (user && inAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [ready, user, isOnboarded, segments]);

  return (
    <>
      <StatusBar style="light" backgroundColor="#07080f" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#07080f' },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}
