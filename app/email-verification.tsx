import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { supabase } from '../lib/supabase';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      Alert.alert('Email inviata', 'Controlla la tua casella di posta.');
    } catch {
      Alert.alert('Errore', 'Impossibile inviare l\'email. Riprova tra qualche minuto.');
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(168,85,247,0.12)', 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.inner}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-outline" size={56} color={Colors.accent} />
        </View>

        <Text style={styles.title}>Controlla la tua email</Text>
        <Text style={styles.subtitle}>
          Abbiamo inviato un link di conferma a{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <View style={styles.stepsCard}>
          <Step num="1" text="Apri la tua casella di posta" />
          <Step num="2" text="Clicca sul link «Conferma email»" />
          <Step num="3" text="Torna sull'app e accedi" />
        </View>

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={resending}
          activeOpacity={0.8}
        >
          {resending
            ? <ActivityIndicator color={Colors.accent} size="small" />
            : <Text style={styles.resendText}>Non hai ricevuto l'email? Invia di nuovo</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.replace('/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.loginBtnText}>Vai al login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

function Step({ num, text }: { num: string; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{num}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 350 },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' },

  iconWrap: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
  },

  title: {
    fontSize: 26, fontFamily: Font.extraBold, color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 12,
  },
  subtitle: {
    fontSize: 15, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 32,
  },
  emailText: {
    color: Colors.accent, fontFamily: Font.semiBold,
  },

  stepsCard: {
    width: '100%', backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 20, gap: 16, marginBottom: 28,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepNum: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(168,85,247,0.15)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: 13, fontFamily: Font.bold, color: Colors.accent },
  stepText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },

  resendBtn: { paddingVertical: 10, marginBottom: 16 },
  resendText: { fontSize: 13, color: Colors.accent, textDecorationLine: 'underline' },

  loginBtn: {
    width: '100%', backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 17, alignItems: 'center',
  },
  loginBtnText: { fontSize: 16, fontFamily: Font.extraBold, color: Colors.white },
});
