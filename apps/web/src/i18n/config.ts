export const locales = [
  'en',
  'ur',
  'ar',
  'fr',
  'es',
  'de',
  'pt',
  'hi',
  'zh',
  'tr',
  'fa',
] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const rtlLocales: Locale[] = ['ur', 'ar', 'fa'];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ur: 'اردو',
  ar: 'العربية',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  hi: 'हिन्दी',
  zh: '中文',
  tr: 'Türkçe',
  fa: 'فارسی',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  ur: '🇵🇰',
  ar: '🇸🇦',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  pt: '🇵🇹',
  hi: '🇮🇳',
  zh: '🇨🇳',
  tr: '🇹🇷',
  fa: '🇮🇷',
};

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale as Locale);
}

export function getDir(locale: string): 'rtl' | 'ltr' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}
