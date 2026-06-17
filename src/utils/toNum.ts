// src/utils/toNum.ts
export const toNum = (x: unknown): number | null => {
  if (x == null) return null;
  const n = Number(x);
  return Number.isNaN(n) ? null : n;
};
