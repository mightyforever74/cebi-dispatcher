/** Stable empty references — never allocate `[]` / `{}` in hook defaults. */
export const EMPTY_ARRAY: never[] = [];
export const EMPTY_OBJECT: Record<string, never> = {};
