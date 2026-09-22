import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { en } from "./en";
import { nl } from "./nl";
import { tr } from "./tr";
import type { Lang, Locale, TFunction, TranslationKey, TVars } from "./types";

export type { Lang, Locale, TFunction, TranslationKey, TranslationSchema, TVars } from "./types";

const LOCALE_BY_LANG: Record<Lang, Locale> = {
  en: "en-US",
  tr: "tr-TR",
  nl: "nl-NL",
};

const LANGS: readonly Lang[] = ["en", "tr", "nl"];

function isLang(value: string | null | undefined): value is Lang {
  return LANGS.includes(value as Lang);
}

function readStoredLang(): Lang {
  try {
    const raw = window.localStorage.getItem("tf-lang");
    if (isLang(raw)) return raw;
  } catch {
    /* private mode / SSR */
  }
  return "en";
}

/** Flatten once at module load. `t()` is Map.get + optional `{var}` replace — no path split. */
function flattenDict(node: unknown, prefix = "", out = new Map<string, string>()): Map<string, string> {
  if (typeof node === "string") {
    if (prefix) out.set(prefix, node);
    return out;
  }
  if (node && typeof node === "object") {
    Object.entries(node as Record<string, unknown>).forEach(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      flattenDict(value, path, out);
    });
  }
  return out;
}

const FLAT: Record<Lang, Map<string, string>> = {
  en: flattenDict(en),
  tr: flattenDict(tr),
  nl: flattenDict(nl),
};

let currentLang: Lang = readStoredLang();

function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

function translate(lang: Lang, key: TranslationKey, vars?: TVars): string {
  const lookup: string =
    vars && typeof vars.count === "number"
      ? vars.count === 1
        ? `${key}_one`
        : `${key}_other`
      : key;

  const table = FLAT[lang];
  let template = table.get(lookup) ?? FLAT.en.get(lookup);

  if (template === undefined) {
    template = table.get(key) ?? FLAT.en.get(key);
  }

  if (template === undefined) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] missing key: ${lookup}`);
    }
    return lookup;
  }

  return interpolate(template, vars);
}

export function t(key: TranslationKey, vars?: TVars): string {
  return translate(currentLang, key, vars);
}

/**
 * Single relative-time helper for dispatcher UI (D3 map badge, later D4 tables).
 * Epoch/invalid timestamps map to `map.relativeNever`.
 */
export function formatRelative(
  then: Date | number | string | null | undefined,
  now: number = Date.now(),
  lang: Lang = currentLang
): string {
  if (then == null) return translate(lang, "map.relativeNever");
  const t0 = typeof then === "number" ? then : new Date(then).getTime();
  if (!Number.isFinite(t0) || t0 <= 0) return translate(lang, "map.relativeNever");
  const diffSec = Math.round((t0 - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(LOCALE_BY_LANG[lang], { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return rtf.format(hr, "hour");
  return rtf.format(Math.round(hr / 24), "day");
}

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  ...DATE_OPTS,
  hour: "2-digit",
  minute: "2-digit",
};

function toEpoch(value: Date | number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const t0 = typeof value === "number" ? value : new Date(value).getTime();
  return Number.isFinite(t0) && t0 > 0 ? t0 : null;
}

/** Locale-aware calendar date (NL `dd-mm-yyyy` via `nl-NL`). Empty → em dash. */
export function formatDate(
  value: Date | number | string | null | undefined,
  lang: Lang = currentLang
): string {
  const t0 = toEpoch(value);
  if (t0 == null) return translate(lang, "common.emptyDash");
  return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang], DATE_OPTS).format(t0);
}

/** Locale-aware date + time. Empty → em dash. */
export function formatDateTime(
  value: Date | number | string | null | undefined,
  lang: Lang = currentLang
): string {
  const t0 = toEpoch(value);
  if (t0 == null) return translate(lang, "common.emptyDash");
  return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang], DATETIME_OPTS).format(t0);
}

/** Locale-aware number (NL comma decimal). Empty / non-finite → em dash. */
export function formatNumber(
  value: number | string | null | undefined,
  lang: Lang = currentLang,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null || value === "") return translate(lang, "common.emptyDash");
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return translate(lang, "common.emptyDash");
  return new Intl.NumberFormat(LOCALE_BY_LANG[lang], options).format(n);
}

/** Empty-cell renderer — never print `null` / `undefined`. */
export function emptyDash(lang: Lang = currentLang): string {
  return translate(lang, "common.emptyDash");
}

type LanguageApi = {
  t: TFunction;
  lang: Lang;
  locale: Locale;
  setLang: (next: Lang) => void;
};

const LanguageContext = createContext<LanguageApi | null>(null);

function persistLang(next: Lang): void {
  currentLang = next;
  try {
    window.localStorage.setItem("tf-lang", next);
  } catch {
    /* private mode / SSR */
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang);
  const setLang = useCallback((next: Lang) => {
    persistLang(next);
    setLangState(next);
  }, []);
  const value = useMemo<LanguageApi>(
    () => ({
      t: (key, vars) => translate(lang, key, vars),
      lang,
      locale: LOCALE_BY_LANG[lang],
      setLang,
    }),
    [lang, setLang]
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return createElement(LanguageContext.Provider, { value }, children);
}

export function useT(): LanguageApi {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return {
    t: (key, vars) => translate(currentLang, key, vars),
    lang: currentLang,
    locale: LOCALE_BY_LANG[currentLang],
    setLang: persistLang,
  };
}
