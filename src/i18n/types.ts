import type { en } from "./en";

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

/**
 * Key tree taken from `typeof en`. Leaves are widened to `string` so `tr`/`nl`
 * can differ in copy while missing/extra keys still fail `satisfies`.
 * (`export type TranslationSchema = typeof en` would freeze English literals.)
 */
export type TranslationSchema = DeepString<typeof en>;

export type Lang = "en" | "tr" | "nl";
export type Locale = "en-US" | "tr-TR" | "nl-NL";

type Join<Prefix extends string, Key extends string> = Prefix extends "" ? Key : `${Prefix}.${Key}`;

type NestedStringKeys<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? Join<Prefix, K>
    : NestedStringKeys<T[K], Join<Prefix, K>>;
}[keyof T & string];

type StripPluralSuffix<K extends string> = K extends `${infer Base}_one`
  ? Base
  : K extends `${infer Base}_other`
  ? Base
  : K;

/** Dotted keypaths into `en`. Plural leaves (`*_one` / `*_other`) collapse to the base key. */
export type TranslationKey = StripPluralSuffix<NestedStringKeys<TranslationSchema>>;

export type TVars = {
  count?: number;
  [name: string]: string | number | undefined;
};

export type TFunction = (key: TranslationKey, vars?: TVars) => string;
