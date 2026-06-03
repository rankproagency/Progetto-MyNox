import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, setStoredLanguage, type LanguageCode } from '../lib/i18n';

export default function LanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as LanguageCode;

  async function handleSelect(code: LanguageCode) {
    if (code === currentLang) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setStoredLanguage(code);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('language.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>{t('language.description')}</Text>

        <View style={styles.list}>
          {SUPPORTED_LANGUAGES.map((lang, index) => {
            const isSelected = currentLang === lang.code;
            const isLast = index === SUPPORTED_LANGUAGES.length - 1;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.row, !isLast && styles.rowBorder]}
                activeOpacity={0.7}
                onPress={() => handleSelect(lang.code as LanguageCode)}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.langName}>{lang.label}</Text>
                  <Text style={styles.langCode}>{lang.code.toUpperCase()}</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.hint}>{t('language.hint')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
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
  description: {
    fontSize: 13, color: Colors.textMuted, lineHeight: 20, marginBottom: 24,
  },
  list: {
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 18,
  },
  rowBorder: {
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowLeft: { gap: 2 },
  langName: { fontSize: 15, fontFamily: Font.semiBold, color: Colors.textPrimary },
  langCode: { fontSize: 11, fontFamily: Font.medium, color: Colors.textMuted, letterSpacing: 1 },
  hint: {
    fontSize: 12, color: Colors.textMuted, lineHeight: 18,
    marginTop: 20, textAlign: 'center',
  },
});
