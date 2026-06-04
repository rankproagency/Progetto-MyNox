'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { translations, getStoredLang, setStoredLang, type LangCode, type Translations } from '@/lib/i18n';

interface LanguageContextValue {
  lang: LangCode;
  t: Translations;
  setLang: (lang: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'it',
  t: translations.it,
  setLang: () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('it');

  useEffect(() => {
    setLangState(getStoredLang());
  }, []);

  function setLang(l: LangCode) {
    setLangState(l);
    setStoredLang(l);
  }

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}
