import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    async function handle() {
      const url = await Linking.getInitialURL();
      if (!url) { router.replace('/login'); return; }

      // Supabase mette i token nell'hash (#access_token=...&refresh_token=...)
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        const params = new URLSearchParams(url.slice(hashIndex + 1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          return; // _layout.tsx gestisce la navigazione in base all'auth state
        }
      }

      // Fallback: flusso PKCE con ?code=...
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code as string | undefined;
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }

      router.replace('/login');
    }

    handle();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={Colors.accent} size="large" />
    </View>
  );
}
