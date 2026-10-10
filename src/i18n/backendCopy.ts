import type { TFunction } from "./types";

/** Backend (AUTH alerts) still emits this TR prefix; map it through the dictionary. */
export const BACKEND_TASK_ACCEPTED_PREFIX = "Görev kabul edildi:";

/**
 * P1-3a (10 Eki, TODO_ACTIVE §4 "Bildirim başlıkları EN arayüzde Türkçe"):
 * core'un task-start transaction'ı (`server.js`, `PUT /api/driver/tasks/:id/start`)
 * `alerts.title`/`description`'a hala sabit TR metin yazıyor. Aynı desen -
 * tek fark: title burada bir ÖNEK değil, SABİT/tam metin (ekli task_no yok).
 */
export const BACKEND_TASK_STARTED_TITLE = "Görev Başladı";
export const BACKEND_TASK_STARTED_PREFIX = "Görev başladı:";

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
  if (raw === BACKEND_TASK_STARTED_TITLE) {
    return translate("notify.taskStarted");
  }
  if (raw.startsWith(BACKEND_TASK_STARTED_PREFIX)) {
    return translate("notify.taskStartedDetail", {
      detail: raw.slice(BACKEND_TASK_STARTED_PREFIX.length).trim(),
    });
  }
  return raw;
}
