/** Temporary local ack set until core exposes POST/PUT /api/alerts/:id/ack. */

export const ACKED_ALERTS_KEY = "tf.alerts.acked";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface AckedStore {
  ids: string[];
  exp: number;
}

export function loadAckedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(ACKED_ALERTS_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return new Set();
    const rec = parsed as { ids?: unknown; exp?: unknown };
    if (typeof rec.exp !== "number" || Date.now() > rec.exp) {
      window.localStorage.removeItem(ACKED_ALERTS_KEY);
      return new Set();
    }
    if (!Array.isArray(rec.ids)) return new Set();
    return new Set(rec.ids.filter((id): id is string => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

export function persistAckedIds(ids: Iterable<string>): void {
  if (typeof window === "undefined") return;
  const merged = loadAckedIds();
  for (const id of ids) {
    if (id) merged.add(id);
  }
  try {
    const payload: AckedStore = {
      ids: Array.from(merged),
      exp: Date.now() + TTL_MS,
    };
    window.localStorage.setItem(ACKED_ALERTS_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}
