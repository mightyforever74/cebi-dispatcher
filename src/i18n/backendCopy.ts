import type { TFunction } from "./types";

/** Backend (AUTH alerts) still emits this TR prefix; map it through the dictionary. */
export const BACKEND_TASK_ACCEPTED_PREFIX = "Görev kabul edildi:";

export function localizeBackendAlert(
  raw: string | undefined,
  translate: TFunction
): string {
  if (!raw) return "";
  if (raw.startsWith(BACKEND_TASK_ACCEPTED_PREFIX)) {
    return translate("notify.taskAccepted", {
      detail: raw.slice(BACKEND_TASK_ACCEPTED_PREFIX.length).trim(),
    });
  }
  return raw;
}
