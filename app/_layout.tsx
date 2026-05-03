import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { TicketsProvider } from '../contexts/TicketsContext';
import { ProfileProvider } from '../contexts/ProfileContext';
import { WaitlistProvider } from '../contexts/WaitlistContext';
import { RecentlyViewedProvider } from '../contexts/RecentlyViewedContext';
import { EventsProvider } from '../contexts/EventsContext';
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
    <StripeProvider publishableKey="pk_test_51TLomNPanZbf0jho10XcgrBg8Zr3qozUnM3BALBYB8ocQOQlG1GWqsemiMV3EtX8iLwkhrBiY5Qrq3lj4NvJBsE400s1LwLnXN">
    <AuthProvider>
      <ProfileProvider>
        <EventsProvider>
          <TicketsProvider>
            <WaitlistProvider>
              <FavoritesProvider>
                <RecentlyViewedProvider>
                  <RootNavigator />
                </RecentlyViewedProvider>
              </FavoritesProvider>
            </WaitlistProvider>
          </TicketsProvider>
        </EventsProvider>
      </ProfileProvider>
    </AuthProvider>
    </StripeProvider>
  );
}

function RootNavigator() {
  const { user, isOnboarded, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const navigating = useRef(false);

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

  const userId = user?.id ?? null;
  const segment0 = segments[0] as string | undefined;

  useEffect(() => {
    if (!ready || isLoading) return;

    const authScreens = ['onboarding', 'login', 'register'];
    const inAuthScreen = authScreens.includes(segment0 ?? '');

    let target: string | null = null;
    if (!isOnboarded && !inAuthScreen) {
      target = '/onboarding';
    } else if (isOnboarded && !userId && !inAuthScreen) {
      target = '/login';
    } else if (userId && inAuthScreen) {
      target = '/(tabs)';
    }

    if (!target || navigating.current) return;
    navigating.current = true;
    router.replace(target as Parameters<typeof router.replace>[0]);
    setTimeout(() => { navigating.current = false; }, 500);
  }, [ready, isLoading, userId, isOnboarded, segment0]);

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
