import { cookies } from 'next/headers';
import { translations, type LangCode } from './i18n';

export async function getT() {
  const cookieStore = await cookies();
  const lang = cookieStore.get('mynox-dashboard-lang')?.value === 'en' ? 'en' : 'it';
  return translations[lang as LangCode];
}

export async function getLocale(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get('mynox-dashboard-lang')?.value === 'en' ? 'en-GB' : 'it-IT';
}
