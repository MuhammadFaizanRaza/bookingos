import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import type { AbstractIntlMessages } from 'next-intl';
import type { Locale } from './config';
import { defaultLocale } from './config';

type Messages = AbstractIntlMessages;

function isPlainObject(value: unknown): value is Messages {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Recursively merges `override` onto `base`. Values present in `override`
 * win; nested objects are merged key-by-key. Anything missing from the
 * override falls back to the base (English) value.
 */
function deepMerge(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };

  for (const key of Object.keys(override)) {
    const baseValue = base[key];
    const overrideValue = override[key];

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
    } else {
      result[key] = overrideValue;
    }
  }

  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  // English is always the base so every locale falls back to it for any
  // keys it does not translate. next-intl therefore never sees a missing key.
  const base = (await import('../messages/en.json')).default as Messages;

  let messages: Messages = base;
  if (locale !== defaultLocale) {
    const localeMessages = (await import(`../messages/${locale}.json`))
      .default as Messages;
    messages = deepMerge(base, localeMessages);
  }

  return {
    locale,
    messages,
  };
});
