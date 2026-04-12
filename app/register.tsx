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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');

  function validateAge(dob: string): boolean {
    const parts = dob.split('/');
    if (parts.length !== 3) return false;
    const birth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    const age = (Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 18;
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim() || !dateOfBirth.trim()) {
      Alert.alert('Errore', 'Compila tutti i campi.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Errore', 'Inserisci un indirizzo email valido.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Errore', 'La password deve essere di almeno 6 caratteri.');
      return;
    }
    if (!validateAge(dateOfBirth)) {
      Alert.alert('Accesso negato', 'Devi avere almeno 18 anni per usare MyNox.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await register(name.trim(), email.trim(), password);
    router.replace('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(168,85,247,0.1)', 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.logoSection}>
              <Text style={styles.logo}>MYNOX</Text>
              <Text style={styles.logoSub}>Crea il tuo account</Text>
            </View>

            <View style={styles.form}>
              <InputField
                label="Nome completo"
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder="Pietro Tortelotti"
              />
              <InputField
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="email@esempio.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Minimo 6 caratteri"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
              <InputField
                label="Data di nascita"
                icon="calendar-outline"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="GG/MM/AAAA"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.ageNote}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.ageNoteText}>Devi avere almeno 18 anni per accedere ai contenuti di MyNox.</Text>
            </View>

            <TouchableOpacity
              style={[styles.ctaButton, isLoading && styles.ctaDisabled]}
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.ctaText}>Registrati</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Hai già un account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}>Accedi</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function InputField({
  label, icon, value, onChangeText, placeholder, keyboardType, autoCapitalize,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'words'}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 350 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  backButton: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 12, marginBottom: 24,
  },
  logoSection: { alignItems: 'center', paddingBottom: 36 },
  logo: {
    fontSize: 32, fontWeight: '900', color: Colors.textPrimary,
    letterSpacing: 6,
    textShadowColor: Colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    marginBottom: 8,
  },
  logoSub: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },

  form: { gap: 20, marginBottom: 16 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  eyeBtn: { padding: 4 },

  ageNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 12, marginBottom: 24,
  },
  ageNoteText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 24,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 16, fontWeight: '800', color: Colors.white },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 14, color: Colors.textSecondary },
  loginLink: { fontSize: 14, fontWeight: '700', color: Colors.accent },
});
