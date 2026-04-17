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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Errore', 'Inserisci email e password.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Accesso fallito', e.message ?? 'Credenziali non valide.');
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(168,85,247,0.20)', 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* Logo */}
            <View style={styles.logoSection}>
              <Image
                source={require('../assets/logo-cropped.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoSub}>Bentornato</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@esempio.com"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="La tua password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => Alert.alert('Password dimenticata', 'Riceverai un\'email per il reset. Funzionalità in arrivo con Supabase Auth.')}
              >
                <Text style={styles.forgotText}>Password dimenticata?</Text>
              </TouchableOpacity>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.ctaButton, isLoading && styles.ctaDisabled]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.ctaText}>Accedi</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>oppure</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity
              style={[styles.socialButton, googleLoading && styles.ctaDisabled]}
              activeOpacity={0.8}
              disabled={googleLoading}
              onPress={async () => {
                setGoogleLoading(true);
                try {
                  await loginWithGoogle();
                  router.replace('/(tabs)');
                } catch (e: any) {
                  Alert.alert('Errore', e.message ?? 'Accesso con Google fallito.');
                } finally {
                  setGoogleLoading(false);
                }
              }}
            >
              {googleLoading ? (
                <ActivityIndicator color={Colors.textPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={19} color="#EA4335" />
                  <Text style={styles.socialText}>Continua con Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple */}
            <TouchableOpacity
              style={styles.socialButton}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Apple Sign In', 'Disponibile prossimamente.')}
            >
              <Ionicons name="logo-apple" size={20} color={Colors.textPrimary} />
              <Text style={styles.socialText}>Continua con Apple</Text>
            </TouchableOpacity>

            {/* Register link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Nuovo su MyNox? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}>Registrati</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 350 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  logoSection: { alignItems: 'center', paddingTop: 100, paddingBottom: 44 },
  logoImage: { width: 254, height: 72, marginBottom: 12 },
  logoSub: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },

  form: { gap: 20, marginBottom: 28 },
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

  forgotBtn: { alignSelf: 'flex-end', marginTop: -8 },
  forgotText: { fontSize: 13, color: Colors.accent },

  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 24,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 16, fontWeight: '800', color: Colors.white },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textMuted },

  socialButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 15, marginBottom: 12,
  },
  socialText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  registerText: { fontSize: 14, color: Colors.textSecondary },
  registerLink: { fontSize: 14, fontWeight: '700', color: Colors.accent },
});
