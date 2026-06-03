import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import it from '../locales/it.json';
import en from '../locales/en.json';

const LANGUAGE_KEY = '@mynox_language';

export const SUPPORTED_LANGUAGES = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
] as const;

export type LanguageCode = 'it' | 'en';

export async function getStoredLanguage(): Promise<LanguageCode | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    return (stored as LanguageCode) || null;
  } catch {
    return null;
  }
}

export async function setStoredLanguage(lang: LanguageCode) {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

export async function initI18n() {
  const stored = await getStoredLanguage();
  const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'it';
  const initialLang: LanguageCode =
    stored ?? (deviceLang.startsWith('en') ? 'en' : 'it');

  await i18n.use(initReactI18next).init({
    resources: { it: { translation: it }, en: { translation: en } },
    lng: initialLang,
    fallbackLng: 'it',
    interpolation: { escapeValue: false },
  });
}

export function getLocale(): string {
  const lang = i18n.language ?? 'it';
  return lang === 'en' ? 'en-GB' : 'it-IT';
}

export default i18n;
