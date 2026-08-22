import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';

export default function AcceptTermsScreen() {
  const router = useRouter();
  const { acceptTerms } = useAuth();
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const canProceed = privacyAccepted && termsAccepted;

  async function handleConfirm() {
    if (!canProceed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await acceptTerms(marketingConsent);
      router.replace('/onboarding');
    } catch {
      Alert.alert('Errore', 'Si è verificato un errore. Riprova.');
    } finally {
      setLoading(false);
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
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <View style={styles.logoSection}>
            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.accent} />
            <Text style={styles.title}>Prima di continuare</Text>
            <Text style={styles.subtitle}>
              Leggi e accetta i nostri documenti per creare il tuo account MyNox.
            </Text>
          </View>

          {/* Privacy */}
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { Haptics.selectionAsync(); setPrivacyAccepted((v) => !v); }}
            >
              <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
                {privacyAccepted && <Ionicons name="checkmark" size={12} color={Colors.white} />}
              </View>
            </TouchableOpacity>
            <View style={styles.checkboxTextRow}>
              <Text
                style={styles.checkboxLabel}
                onPress={() => { Haptics.selectionAsync(); setPrivacyAccepted((v) => !v); }}
              >
                Ho letto e accetto la{' '}
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/privacy')}>
                <Text style={styles.checkboxLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}> *</Text>
            </View>
          </View>

          {/* T&C */}
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { Haptics.selectionAsync(); setTermsAccepted((v) => !v); }}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Ionicons name="checkmark" size={12} color={Colors.white} />}
              </View>
            </TouchableOpacity>
            <View style={styles.checkboxTextRow}>
              <Text
                style={styles.checkboxLabel}
                onPress={() => { Haptics.selectionAsync(); setTermsAccepted((v) => !v); }}
              >
                Ho letto e accetto i{' '}
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/terms')}>
                <Text style={styles.checkboxLink}>Termini e Condizioni</Text>
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}> *</Text>
            </View>
          </View>

          {/* Marketing consent (opzionale) */}
          <TouchableOpacity
            style={styles.checkboxRow}
            activeOpacity={0.7}
            onPress={() => { Haptics.selectionAsync(); setMarketingConsent((v) => !v); }}
          >
            <View style={[styles.checkbox, marketingConsent && styles.checkboxChecked]}>
              {marketingConsent && <Ionicons name="checkmark" size={12} color={Colors.white} />}
            </View>
            <Text style={styles.checkboxLabel}>
              Acconsento a ricevere comunicazioni promozionali da MyNox e dalle discoteche partner (facoltativo)
            </Text>
          </TouchableOpacity>

          <Text style={styles.requiredNote}>* campi obbligatori</Text>

          <TouchableOpacity
            style={[styles.ctaButton, (!canProceed || loading) && styles.ctaDisabled]}
            activeOpacity={0.85}
            onPress={handleConfirm}
            disabled={!canProceed || loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.ctaText}>Continua</Text>}
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 350 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 32 },

  logoSection: { alignItems: 'center', marginBottom: 40, gap: 12 },
  title: {
    fontSize: 24, fontFamily: Font.extraBold, color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20,
  },

  checkboxRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  checkboxTextRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  checkboxLabel: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  checkboxLink: { fontSize: 13, color: Colors.accent, fontFamily: Font.semiBold },

  requiredNote: { fontSize: 11, color: Colors.textMuted, marginBottom: 32, marginTop: -8 },

  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontSize: 16, fontFamily: Font.extraBold, color: Colors.white },
});
