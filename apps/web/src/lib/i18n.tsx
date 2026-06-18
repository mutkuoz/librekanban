import { type ReactNode, createContext, useContext, useMemo, useState } from 'react';
import { type TranslationKey, en } from './locales/en';
import { tr } from './locales/tr';

export type { TranslationKey } from './locales/en';

export const LANGUAGES = { en: 'English', tr: 'Türkçe' } as const;
export type Lang = keyof typeof LANGUAGES;

const DICTS: Record<Lang, Record<TranslationKey, string>> = { en, tr };
const LANG_KEY = 'lk_lang';

function readStoredLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'en' || v === 'tr' ? v : null;
  } catch {
    return null;
  }
}

/** Stored preference, else the browser language if Turkish, else English. */
function initialLang(): Lang {
  const stored = readStoredLang();
  if (stored) return stored;
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('tr')) {
    return 'tr';
  }
  return 'en';
}

export type TFunc = (key: TranslationKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFunc;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTS[lang];
    return {
      lang,
      setLang: (next) => {
        setLangState(next);
        try {
          localStorage.setItem(LANG_KEY, next);
        } catch {}
        if (typeof document !== 'undefined') document.documentElement.lang = next;
      },
      t: (key, vars) => {
        let s = dict[key] ?? en[key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
        return s;
      },
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

/** Convenience hook for components that only need the translate function. */
export const useT = (): TFunc => useI18n().t;
