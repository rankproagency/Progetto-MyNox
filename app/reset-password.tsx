import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let linkSub: ReturnType<typeof Linking.addEventListener> | null = null;

    async function tryHandleUrl(url: string): Promise<boolean> {
      const hash = url.split('#')[1];
      if (!hash) return false;
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');
      if (type !== 'recovery' || !accessToken || !refreshToken) return false;
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionErr) return false;
      setReady(true);
      return true;
    }

    async function init() {
      // Cold start: URL that launched the app
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && await tryHandleUrl(initialUrl)) return;

      // App già aperta: ascolta l'evento URL
      linkSub = Linking.addEventListener('url', async ({ url }) => {
        await tryHandleUrl(url);
      });

      // Fallback: sessione recovery già attiva (es. navigazione interna)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setReady(true); return; }

      // Nessun token valido trovato
      setTokenError(true);
    }

    init();
    return () => { linkSub?.remove(); };
  }, []);

  async function handleSave() {
    if (password !== confirm) {
      setError('Le password non coincidono.');
      return;
    }
    if (password.length < 8) {
      setError('La password deve avere almeno 8 caratteri.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) { setError(updateErr.message); return; }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Password aggiornata',
      'La tua password è stata cambiata con successo. Accedi con la nuova password.',
      [{
        text: 'Accedi',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        },
      }],
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuova password</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {tokenError ? (
            <View style={styles.errorState}>
              <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
              <Text style={styles.errorStateTitle}>Link non valido</Text>
              <Text style={styles.errorStateText}>
                Il link di reset è scaduto o non valido. Richiedi un nuovo link dalla schermata di login.
              </Text>
              <TouchableOpacity style={styles.errorStateBtn} onPress={() => router.replace('/login')}>
                <Text style={styles.errorStateBtnText}>Torna al login</Text>
              </TouchableOpacity>
            </View>
          ) : !ready ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Verifica del link in corso...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Scegli una nuova password di almeno 8 caratteri.
              </Text>

              <PasswordField
                label="Nuova password"
                value={password}
                onChangeText={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                placeholder="Minimo 8 caratteri"
              />

              <PasswordField
                label="Conferma nuova password"
                value={confirm}
                onChangeText={setConfirm}
                show={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
                placeholder="Ripeti la nuova password"
              />

              {password.length > 0 && (
                <View style={styles.strength}>
                  <View style={[styles.strengthBar, { backgroundColor: strengthColor(password) }]} />
                  <Text style={[styles.strengthLabel, { color: strengthColor(password) }]}>
                    {strengthLabel(password)}
                  </Text>
                </View>
              )}

              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </>
          )}

        </ScrollView>

        {ready && !tokenError && (
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={[styles.ctaButton, loading && { opacity: 0.6 }]}
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.ctaText}>Imposta nuova password</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({
  label, value, onChangeText, show, onToggle, placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function strengthColor(pwd: string): string {
  if (pwd.length < 8) return '#ef4444';
  if (pwd.length < 12) return '#f59e0b';
  return '#22c55e';
}

function strengthLabel(pwd: string): string {
  if (pwd.length < 8) return 'Troppo corta';
  if (pwd.length < 12) return 'Discreta';
  return 'Sicura';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 16, fontFamily: Font.bold, color: Colors.textPrimary },
  backButton: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  scroll: { padding: 20, paddingBottom: 40 },
  subtitle: {
    fontSize: 14, color: Colors.textSecondary, lineHeight: 20,
    marginBottom: 24,
  },

  field: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary, paddingVertical: 14 },
  eyeBtn: { paddingLeft: 10 },

  strength: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontFamily: Font.semiBold },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.20)',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8,
  },
  errorText: { fontSize: 13, color: Colors.error, flex: 1 },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  loadingText: { fontSize: 14, color: Colors.textMuted },

  errorState: { flex: 1, alignItems: 'center', paddingTop: 60, gap: 16, paddingHorizontal: 8 },
  errorStateTitle: { fontSize: 20, fontFamily: Font.bold, color: Colors.textPrimary },
  errorStateText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  errorStateBtn: {
    marginTop: 8, backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  errorStateBtnText: { fontSize: 14, fontFamily: Font.semiBold, color: Colors.textPrimary },

  ctaContainer: {
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  ctaText: { fontSize: 16, fontFamily: Font.extraBold, color: Colors.white },
});
