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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useAuth } from '../contexts/AuthContext';

const MAX_DATE = new Date();
MAX_DATE.setFullYear(MAX_DATE.getFullYear() - 14); // età minima 14 anni (D.Lgs. 196/2003)

function formatDOB(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loginWithGoogle, isLoading } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(MAX_DATE);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !dateOfBirth) {
      Alert.alert('Errore', 'Compila tutti i campi.');
      return;
    }
    if (!privacyAccepted) {
      Alert.alert('Errore', 'Devi confermare di avere almeno 14 anni e accettare la Privacy Policy.');
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
    if (password !== confirmPassword) {
      Alert.alert('Errore', 'Le password non coincidono.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await register(name.trim(), email.trim(), password, dateOfBirth);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Registrazione fallita', e.message ?? 'Riprova più tardi.');
    }
  }

  function handlePickerChange(_: any, selected?: Date) {
    if (selected) setTempDate(selected);
  }

  function confirmDate() {
    setDateOfBirth(tempDate);
    setShowPicker(false);
    Haptics.selectionAsync();
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.accentBgMid, 'transparent']}
        style={styles.bgGradient}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.logoSection}>
              <Image
                source={require('../assets/logo-cropped.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoSub}>Crea il tuo account</Text>
            </View>

            <View style={styles.form}>
              <InputField
                label="Nome completo"
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder="nome e cognome"
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

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Conferma password</Text>
                <View style={[
                  styles.inputRow,
                  confirmPassword.length > 0 && password !== confirmPassword && styles.inputRowError,
                ]}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Ripeti la password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <Text style={styles.fieldError}>Le password non coincidono</Text>
                )}
              </View>

              {/* Data di nascita — picker nativo */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Data di nascita</Text>
                <TouchableOpacity
                  style={[styles.inputRow, styles.dateRow]}
                  onPress={() => { Haptics.selectionAsync(); setShowPicker(true); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <Text style={[styles.dateText, !dateOfBirth && styles.datePlaceholder]}>
                    {dateOfBirth ? formatDOB(dateOfBirth) : 'Seleziona la tua data di nascita'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => { Haptics.selectionAsync(); setPrivacyAccepted((v) => !v); }}
            >
              <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
                {privacyAccepted && <Ionicons name="checkmark" size={12} color={Colors.white} />}
              </View>
              <Text style={styles.checkboxLabel}>
                Confermo di avere almeno 14 anni e di aver letto e accettato la{' '}
                <Text style={styles.checkboxLink} onPress={() => router.push('/privacy')}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ctaButton, (!privacyAccepted || !dateOfBirth || isLoading) && styles.ctaDisabled]}
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={!privacyAccepted || !dateOfBirth || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.ctaText}>Registrati</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>oppure</Text>
              <View style={styles.dividerLine} />
            </View>

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

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Hai già un account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}>Accedi</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Date picker modal */}
      {showPicker && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.pickerCancel}>Annulla</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Data di nascita</Text>
              <TouchableOpacity onPress={confirmDate}>
                <Text style={styles.pickerConfirm}>Conferma</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              maximumDate={MAX_DATE}
              minimumDate={new Date(1920, 0, 1)}
              onChange={handlePickerChange}
              textColor={Colors.textPrimary}
              locale="it-IT"
              style={styles.picker}
            />
          </View>
        </Modal>
      )}
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
  logoSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 36 },
  logoImage: { width: 254, height: 72, marginBottom: 12 },
  logoSub: { fontSize: 16, color: Colors.textSecondary, fontFamily: Font.medium },

  form: { gap: 20, marginBottom: 16 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: Colors.textPrimary },
  eyeBtn: { padding: 4 },
  inputRowError: { borderColor: Colors.error },
  fieldError: { fontSize: 12, color: Colors.error, marginTop: 2 },

  dateRow: { paddingVertical: 14 },
  dateText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  datePlaceholder: { color: Colors.textMuted },

  checkboxRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent, borderColor: Colors.accent,
  },
  checkboxLabel: {
    flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18,
  },
  checkboxLink: {
    color: Colors.accent, fontFamily: Font.semiBold,
  },

  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginBottom: 24,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 16, fontFamily: Font.extraBold, color: Colors.white },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textMuted },

  socialButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 15, marginBottom: 24,
  },
  socialText: { fontSize: 15, fontFamily: Font.semiBold, color: Colors.textPrimary },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 14, color: Colors.textSecondary },
  loginLink: { fontSize: 14, fontFamily: Font.bold, color: Colors.accent },

  // Picker
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pickerSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: Colors.border,
    paddingBottom: 40,
  },
  pickerHandle: {
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pickerTitle: { fontSize: 15, fontFamily: Font.bold, color: Colors.textPrimary },
  pickerCancel: { fontSize: 15, color: Colors.textMuted },
  pickerConfirm: { fontSize: 15, fontFamily: Font.bold, color: Colors.accent },
  picker: { width: '100%' },
});
