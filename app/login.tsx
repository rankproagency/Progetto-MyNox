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
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter(); // used for push('/register') and push('forgot-password')
  const { login, loginWithGoogle, resetPassword, isLoading } = useAuth();
  const { t } = useTranslation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  async function handleLogin() {
    setLoginError('');
    if (!email.trim() || !password.trim()) {
      setLoginError(t('login.error_empty_fields'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await login(email.trim(), password);
      // navigation handled by _layout.tsx once auth state updates
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoginError(e.message ?? t('login.error_invalid_credentials'));
    }
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

            {/* Logo */}
            <View style={styles.logoSection}>
              <Image
                source={require('../assets/logo-cropped.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoSub}>{t('login.welcome_back')}</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('login.email_label')}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('login.email_placeholder')}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('login.password_label')}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('login.password_placeholder')}
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
                onPress={() => {
                  const target = email.trim();
                  if (!target) {
                    Alert.alert(t('login.forgot_password_title'), t('login.forgot_password_prompt'));
                    return;
                  }
                  Alert.alert(
                    t('login.reset_password_title'),
                    t('login.reset_password_confirm', { email: target }),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('login.reset_send_email'),
                        onPress: async () => {
                          try {
                            await resetPassword(target);
                            Alert.alert(t('login.reset_email_sent_title'), t('login.reset_email_sent_body', { email: target }));
                          } catch (e: any) {
                            Alert.alert(t('common.error'), e.message ?? t('login.reset_error'));
                          }
                        },
                      },
                    ],
                  );
                }}
              >
                <Text style={styles.forgotText}>{t('login.forgot_password')}</Text>
              </TouchableOpacity>
            </View>

            {/* Errore login */}
            {loginError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={15} color="#f87171" />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

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
                <Text style={styles.ctaText}>{t('login.sign_in_btn')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity
              style={[styles.appleButton, googleLoading && styles.ctaDisabled]}
              activeOpacity={0.8}
              disabled={googleLoading}
              onPress={async () => {
                setGoogleLoading(true);
                try {
                  await loginWithGoogle();
                  // navigation handled by _layout.tsx once auth state updates
                } catch (e: any) {
                  Alert.alert(t('common.error'), e.message ?? t('login.error_google_failed'));
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
                  <Text style={styles.appleText}>{t('login.continue_google')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple — sfondo nero obbligatorio per Apple HIG Sign in with Apple */}
            <TouchableOpacity
              style={styles.appleButton}
              activeOpacity={0.8}
              onPress={() => Alert.alert(t('login.continue_apple'), t('login.apple_coming_soon'))}
            >
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text style={styles.appleText}>{t('login.continue_apple')}</Text>
            </TouchableOpacity>

            {/* Register link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>{t('login.no_account')}</Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}>{t('login.sign_up_link')}</Text>
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
  scroll: { paddingHorizontal: 24, paddingBottom: 20 },

  logoSection: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  logoImage: { width: 254, height: 72, marginBottom: 12 },
  logoSub: {
    fontSize: 19,
    color: Colors.accent,
    fontFamily: Font.semiBold,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(168,85,247,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },

  form: { gap: 20, marginBottom: 12 },
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

  forgotBtn: { alignSelf: 'flex-end', marginTop: -8 },
  forgotText: { fontSize: 13, color: Colors.accent },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.20)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: '#f87171', flex: 1, fontFamily: Font.regular },

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
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 15, marginBottom: 12,
  },
  socialText: { fontSize: 15, fontFamily: Font.semiBold, color: Colors.textPrimary },
  appleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#000000',
    borderRadius: 16, borderWidth: 1, borderColor: '#000000',
    paddingVertical: 15, marginBottom: 12,
  },
  appleText: { fontSize: 15, fontFamily: Font.semiBold, color: '#FFFFFF' },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  registerText: { fontSize: 14, color: Colors.textSecondary },
  registerLink: { fontSize: 14, fontFamily: Font.bold, color: Colors.accent },
});
