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
import { useTranslation } from 'react-i18next';
import { getLocale } from '../lib/i18n';
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
  const { register, loginWithGoogle, loginWithApple, isLoading } = useAuth();
  const { t } = useTranslation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !dateOfBirth) {
      Alert.alert(t('common.error'), t('register.error_fill_all'));
      return;
    }
    if (!privacyAccepted || !termsAccepted) {
      Alert.alert(t('common.error'), t('register.error_accept_policies'));
      return;
    }
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 14);
    if (dateOfBirth > minDate) {
      Alert.alert(t('common.error'), t('register.error_min_age'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      Alert.alert(t('common.error'), t('register.error_invalid_email'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('register.error_password_too_short'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('register.error_password_mismatch'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { requiresEmailConfirmation } = await register(name.trim(), email.trim(), password, dateOfBirth, marketingConsent);
      if (requiresEmailConfirmation) {
        router.replace({ pathname: '/email-verification', params: { email: email.trim() } });
      }
      // if no confirmation required, navigation handled by _layout.tsx
    } catch (e: any) {
      Alert.alert(t('register.error_registration_failed'), e.message ?? t('common.retry'));
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
              <Text style={styles.logoSub}>{t('register.create_account')}</Text>
            </View>

            <View style={styles.form}>
              <InputField
                label={t('register.full_name_label')}
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder={t('register.full_name_placeholder')}
              />
              <InputField
                label={t('register.email_label')}
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder={t('register.email_placeholder')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('register.password_label')}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('register.password_placeholder')}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    textContentType="oneTimeCode"
                    autoComplete="off"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('register.confirm_password_label')}</Text>
                <View style={[
                  styles.inputRow,
                  confirmPassword.length > 0 && password !== confirmPassword && styles.inputRowError,
                ]}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t('register.confirm_password_placeholder')}
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    textContentType="oneTimeCode"
                    autoComplete="off"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <Text style={styles.fieldError}>{t('register.password_mismatch')}</Text>
                )}
              </View>

              {/* Data di nascita — picker nativo, stile distinto per comunicare "tocca per selezionare" */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('register.dob_label')}</Text>
                <TouchableOpacity
                  style={[styles.inputRow, styles.dateRow]}
                  onPress={() => { Haptics.selectionAsync(); setShowPicker(true); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <Text style={[styles.dateText, !dateOfBirth && styles.datePlaceholder]}>
                    {dateOfBirth ? formatDOB(dateOfBirth) : t('register.dob_placeholder')}
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
                {t('register.privacy_accept')}
                <Text style={styles.checkboxLink} onPress={() => router.push('/privacy')}>
                  {t('register.privacy_link')}
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => { Haptics.selectionAsync(); setTermsAccepted((v) => !v); }}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Ionicons name="checkmark" size={12} color={Colors.white} />}
              </View>
              <Text style={styles.checkboxLabel}>
                {t('register.terms_accept')}
                <Text style={styles.checkboxLink} onPress={() => router.push('/terms')}>
                  {t('register.terms_link')}
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => { Haptics.selectionAsync(); setMarketingConsent((v) => !v); }}
            >
              <View style={[styles.checkbox, marketingConsent && styles.checkboxChecked]}>
                {marketingConsent && <Ionicons name="checkmark" size={12} color={Colors.white} />}
              </View>
              <Text style={styles.checkboxLabel}>{t('register.marketing_accept')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ctaButton, (!privacyAccepted || !termsAccepted || !dateOfBirth || isLoading) && styles.ctaDisabled]}
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={!privacyAccepted || !termsAccepted || !dateOfBirth || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.ctaText}>{t('register.sign_up_btn')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.darkSocialButton, { marginBottom: 12 }, googleLoading && styles.ctaDisabled]}
              activeOpacity={0.8}
              disabled={googleLoading}
              onPress={async () => {
                setGoogleLoading(true);
                try {
                  await loginWithGoogle();
                  // navigation handled by _layout.tsx once auth state updates
                } catch (e: any) {
                  Alert.alert(t('common.error'), e.message ?? t('register.error_google_failed'));
                } finally {
                  setGoogleLoading(false);
                }
              }}
            >
              {googleLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={19} color="#EA4335" />
                  <Text style={styles.darkSocialText}>{t('register.continue_google')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple — sfondo nero obbligatorio per Apple HIG Sign in with Apple */}
            <TouchableOpacity
              style={[styles.darkSocialButton, appleLoading && styles.ctaDisabled]}
              activeOpacity={0.8}
              disabled={appleLoading}
              onPress={async () => {
                setAppleLoading(true);
                try {
                  await loginWithApple();
                } catch (e: any) {
                  if (e?.code !== 'ERR_REQUEST_CANCELED') {
                    Alert.alert(t('common.error'), e.message ?? t('login.error_apple_failed'));
                  }
                } finally {
                  setAppleLoading(false);
                }
              }}
            >
              {appleLoading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <><Ionicons name="logo-apple" size={20} color="#FFFFFF" /><Text style={styles.darkSocialText}>{t('login.continue_apple')}</Text></>
              }
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>{t('register.already_account')}</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}>{t('register.sign_in_link')}</Text>
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
                <Text style={styles.pickerCancel}>{t('register.dob_modal_cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>{t('register.dob_modal_title')}</Text>
              <TouchableOpacity onPress={confirmDate}>
                <Text style={styles.pickerConfirm}>{t('register.dob_modal_confirm')}</Text>
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
              locale={getLocale()}
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

  form: { gap: 20, marginBottom: 32 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 12, fontFamily: Font.semiBold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)',
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

  darkSocialButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#000000',
    borderRadius: 16, borderWidth: 1, borderColor: '#000000',
    paddingVertical: 15, marginBottom: 24,
  },
  darkSocialText: { fontSize: 15, fontFamily: Font.semiBold, color: '#FFFFFF' },

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
