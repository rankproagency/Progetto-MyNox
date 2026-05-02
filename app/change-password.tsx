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
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!current.trim() || !next.trim() || !confirm.trim()) {
      Alert.alert('Errore', 'Compila tutti i campi.');
      return;
    }
    if (next.length < 8) {
      Alert.alert('Errore', 'La nuova password deve avere almeno 8 caratteri.');
      return;
    }
    if (next !== confirm) {
      Alert.alert('Errore', 'Le password non coincidono.');
      return;
    }

    setLoading(true);

    // Verifica la password attuale ri-autenticando
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: current,
    });

    if (signInErr) {
      setLoading(false);
      Alert.alert('Errore', 'La password attuale non è corretta.');
      return;
    }

    // Aggiorna con la nuova password
    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    setLoading(false);

    if (updateErr) {
      Alert.alert('Errore', updateErr.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Password aggiornata', 'La tua password è stata cambiata con successo.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cambia password</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <PasswordField
            label="Password attuale"
            value={current}
            onChangeText={setCurrent}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            placeholder="Inserisci la password attuale"
          />

          <PasswordField
            label="Nuova password"
            value={next}
            onChangeText={setNext}
            show={showNext}
            onToggle={() => setShowNext((v) => !v)}
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

          {next.length > 0 && (
            <View style={styles.strength}>
              <View style={[styles.strengthBar, { backgroundColor: strengthColor(next) }]} />
              <Text style={[styles.strengthLabel, { color: strengthColor(next) }]}>
                {strengthLabel(next)}
              </Text>
            </View>
          )}

        </ScrollView>

        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaButton, loading && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.ctaText}>Salva password</Text>
            }
          </TouchableOpacity>
        </View>
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
  input: {
    flex: 1, fontSize: 15, color: Colors.textPrimary,
    paddingVertical: 14,
  },
  eyeBtn: { paddingLeft: 10 },

  strength: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4,
  },
  strengthBar: {
    flex: 1, height: 3, borderRadius: 2,
  },
  strengthLabel: { fontSize: 12, fontFamily: Font.semiBold },

  ctaContainer: {
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { fontSize: 16, fontFamily: Font.extraBold, color: Colors.white },
});
