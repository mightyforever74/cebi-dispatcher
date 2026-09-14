import {
  createContext,
  createElement,
  useCallback,
  useContext,
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
