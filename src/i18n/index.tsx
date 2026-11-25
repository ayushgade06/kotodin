import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { bn } from './bn';

export type Lang = 'en' | 'bn';
export type Key = keyof typeof en;
const DICTS: Record<Lang, Record<Key, string>> = { en, bn };
const LS_KEY = 'kotodin:lang';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const toBanglaDigits = (s: string | number) => String(s).replace(/[0-9]/g, d => BN_DIGITS[+d]);

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, lang === 'bn' ? toBanglaDigits(v) : String(v));
  return s;
}

export function formatDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

export const formatNum = (n: number, lang: Lang, maxFrac = 0) =>
  new Intl.NumberFormat(lang === 'bn' ? 'bn-BD' : 'en-US', { maximumFractionDigits: maxFrac }).format(n);

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; t: (k: Key, v?: Record<string, string | number>) => string }
const Ctx = createContext<LangCtx | null>(null);

function initialLang(): Lang {
  try { const v = localStorage.getItem(LS_KEY); if (v === 'en' || v === 'bn') return v; } catch { /* storage blocked */ }
  return 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LS_KEY, l); } catch { /* storage blocked */ }
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t: (k: Key, v?: Record<string, string | number>) => translate(lang, k, v) }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLang outside LangProvider');
  return c;
}
