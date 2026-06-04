export type LangCode = 'it' | 'en';

const STORAGE_KEY = 'mynox-dashboard-lang';

export const translations = {
  it: {
    nav: {
      home: 'Home',
      myEvents: 'I miei eventi',
      venue: 'Piantina & Tavoli',
      analytics: 'Analytics',
      scanner: 'Scanner',
      promo: 'Codici Promo',
      staff: 'Staff',
      settings: 'Profilo club',
      clubs: 'Discoteche',
      allEvents: 'Eventi',
      users: 'Utenti',
    },
    common: { logout: 'Esci' },
    language: { label: 'Lingua' },
  },
  en: {
    nav: {
      home: 'Home',
      myEvents: 'My events',
      venue: 'Floor plan & Tables',
      analytics: 'Analytics',
      scanner: 'Scanner',
      promo: 'Promo codes',
      staff: 'Staff',
      settings: 'Club profile',
      clubs: 'Venues',
      allEvents: 'Events',
      users: 'Users',
    },
    common: { logout: 'Logout' },
    language: { label: 'Language' },
  },
} satisfies Record<LangCode, {
  nav: Record<string, string>;
  common: { logout: string };
  language: { label: string };
}>;

export type Translations = typeof translations.it;

export function getStoredLang(): LangCode {
  if (typeof window === 'undefined') return 'it';
  const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (stored === 'it' || stored === 'en') return stored;
  return navigator.language?.startsWith('en') ? 'en' : 'it';
}

export function setStoredLang(lang: LangCode) {
  localStorage.setItem(STORAGE_KEY, lang);
}
