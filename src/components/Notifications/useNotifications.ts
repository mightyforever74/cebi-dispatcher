import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAlerts, EMPTY_ALERTS, type Alert } from "hooks/useAlerts";
import {
  useExceptions,
  type ExceptionEvent,
  type ResolveAction,
} from "hooks/useExceptions";
import { localizeBackendAlert, t, type TranslationKey } from "i18n";
import { useAuthStore } from "store/useAuthStore";
import { useResolveAlert } from "hooks/useAlerts";

const MERGE_WINDOW_MS = 10_000;
const MAX_VISIBLE_TOASTS = 3;
const MAX_VISIBLE_BANNERS = 2;

export type NotifyChannel = "banner" | "toast";

export interface NotifyItem {
  id: string;
  channel: NotifyChannel;
  source: "exception" | "telemetry";
  type: string;
  family: string;
  severity: string;
  title: string;
  titleKey?: TranslationKey;
  body: string;
  count: number;
  createdAt: number;
  canAck: boolean;
  exceptionId?: string;
  exceptionIds?: string[];
  alertIds?: string[];
}

function typeFamily(type: string): string {
  const raw = (type || "default").toLowerCase();
  if (raw === "sos") return "sos";
  if (raw === "driver_offline") return "driver_offline";
  if (raw.includes("geofence")) return "geofence";
  if (raw.includes("speed") || raw === "overspeed") return "speed";
  if (raw.startsWith("task_")) return "task";
  return raw;
}

function isBannerType(type: string, severity: string): boolean {
  const family = typeFamily(type);
  return severity === "critical" || family === "sos" || family === "driver_offline";
}

function titleKeyFor(type: string, severity: string): TranslationKey {
  const family = typeFamily(type);
  if (family === "sos") return "notifications.sos.title";
  const exceptionKey = `status.exception.${family}` as TranslationKey;
  if (t(exceptionKey) !== exceptionKey) return exceptionKey;
  const notifyKey = `notify.${family}` as TranslationKey;
  if (t(notifyKey) !== notifyKey) return notifyKey;
  if (severity === "critical") return "notify.bannerCritical";
  return "notify.bannerCritical";
}

function titleFor(type: string, severity: string): string {
  const key = titleKeyFor(type, severity);
  const label = t(key);
  if (label !== key) return label;
  return type || t("notify.bannerCritical");
}

function sosBody(task?: string, plate?: string): string {
  return t("notifications.sos.body", {
    task: task || t("notify.task"),
    plate: plate || t("common.emptyDash"),
  });
}

function bodyForException(e: ExceptionEvent): string {
  const p = e.detection_payload || {};
  if (typeFamily(e.exception_type) === "sos") {
    return sosBody(
      p.task_no != null ? String(p.task_no) : undefined,
      p.vehicle_plate != null ? String(p.vehicle_plate) : undefined
    );
  }
  const parts: string[] = [];
  if (p.task_no) parts.push(String(p.task_no));
  if (p.vehicle_plate) parts.push(String(p.vehicle_plate));
  return parts.join(" · ") || e.exception_type;
}

function sameBannerSnapshot(a: NotifyItem[], b: NotifyItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (item, i) =>
      item.id === b[i].id &&
      item.count === b[i].count &&
      item.titleKey === b[i].titleKey &&
      item.body === b[i].body &&
      item.severity === b[i].severity &&
      item.family === b[i].family
  );
}

function bodyForAlert(a: Alert): string {
  const type = String(a.alert_type || a.type || "");
  if (typeFamily(type) === "sos") {
    return sosBody(a.title, a.vehicle_plate);
  }
  const fromTitle = localizeBackendAlert(a.title, t);
  if (a.title && fromTitle !== a.title) return fromTitle;
  const fromDesc = localizeBackendAlert(a.description, t);
  if (a.description && fromDesc !== a.description) return fromDesc;
  return a.description || a.title || a.vehicle_plate || a.alert_type || a.type || a.id || "";
}

type Api = {
  banners: NotifyItem[];
  toasts: NotifyItem[];
  exceptions: ExceptionEvent[];
  loading: boolean;
  error: string | null;
  lastOkAt: number | null;
  newIds: Set<string>;
  refresh: () => Promise<void>;
  resolve: (id: string, action: ResolveAction, comment?: string) => Promise<void>;
  dismissBanner: (id: string) => void;
  dismissToast: (id: string) => void;
  acknowledge: (item: NotifyItem) => Promise<void>;
  notifyToast: (opts: {
    type: string;
    title?: string;
    titleKey?: TranslationKey;
    body?: string;
    severity?: string;
  }) => void;
};

const NotifyContext = createContext<Api | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const {
    exceptions,
    loading,
    error,
    newIds,
    refresh,
    resolve,
    lastOkAt,
  } = useExceptions(token);
  const { data: alertsData } = useAlerts();
  const alerts = useMemo<Alert[]>(() => alertsData ?? EMPTY_ALERTS, [alertsData]);

  const [banners, setBanners] = useState<NotifyItem[]>([]);
  const [toastQueue, setToastQueue] = useState<NotifyItem[]>([]);
  const dismissedRef = useRef<Set<string>>(new Set());
  const toastedRef = useRef<Set<string>>(new Set());
  const firstAlertsRef = useRef(true);

  const resolveAlert = useResolveAlert();

  useEffect(() => {
    const byFamily = new Map<string, NotifyItem>();
    const consider = (item: NotifyItem) => {
      const family = item.family;
      if (dismissedRef.current.has(item.id) || dismissedRef.current.has(`family:${family}`)) return;
      const existing = byFamily.get(family);
      if (existing) {
        existing.count += 1;
        existing.createdAt = Math.max(existing.createdAt, item.createdAt);
        existing.body = item.body;
        existing.canAck = existing.canAck || item.canAck;
        if (item.exceptionId) {
          existing.exceptionIds = [...(existing.exceptionIds ?? []), item.exceptionId];
        }
        if (item.alertIds?.length) {
          existing.alertIds = [...(existing.alertIds ?? []), ...item.alertIds];
        }
        return;
      }
      byFamily.set(family, {
        ...item,
        id: `banner:${family}`,
        count: 1,
        exceptionIds: item.exceptionId ? [item.exceptionId] : [],
        alertIds: item.alertIds ?? [],
      });
    };

    exceptions.forEach((e) => {
      if (e.status !== "open") return;
      if (!isBannerType(e.exception_type, e.severity)) return;
      const family = typeFamily(e.exception_type);
      consider({
        id: `ex:${e.id}`,
        channel: "banner",
        source: "exception",
        type: e.exception_type,
        family,
        severity: e.severity,
        title: titleFor(e.exception_type, e.severity),
        titleKey: titleKeyFor(e.exception_type, e.severity),
        body: bodyForException(e),
        count: 1,
        createdAt: new Date(e.occurred_at).getTime(),
        canAck: true,
        exceptionId: e.id,
      });
    });
    alerts.forEach((a) => {
      if (a.is_resolved) return;
      const type = String(a.alert_type || a.type || "default");
      const severity = String(a.severity || "").toLowerCase();
      if (!isBannerType(type, severity)) return;
      const family = typeFamily(type);
      consider({
        id: `al:${a.id}`,
        channel: "banner",
        source: "telemetry",
        type,
        family,
        severity: severity || "critical",
        title: titleFor(type, severity || "critical"),
        titleKey: titleKeyFor(type, severity || "critical"),
        body: bodyForAlert(a),
        count: 1,
        createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
        canAck: true,
        alertIds: [a.id],
      });
    });
    const next = Array.from(byFamily.values()).sort((a, b) => b.createdAt - a.createdAt);
    setBanners((prev) => (sameBannerSnapshot(prev, next) ? prev : next));
  }, [exceptions, alerts]);

  const enqueueToasts = useCallback((incoming: NotifyItem[]) => {
    if (incoming.length === 0) return;
    setToastQueue((prev) => {
      const now = Date.now();
      const next = [...prev];
      incoming.forEach((item) => {
        const family = typeFamily(item.type);
        const mergeInto = next.find(
          (tItem) => typeFamily(tItem.type) === family && now - tItem.createdAt <= MERGE_WINDOW_MS
        );
        if (mergeInto) {
          mergeInto.count += item.count;
          mergeInto.createdAt = now;
          mergeInto.body = item.body;
          return;
        }
        next.push({ ...item, createdAt: now });
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (newIds.size === 0) return;
    const incoming: NotifyItem[] = [];
    exceptions.forEach((e) => {
      if (!newIds.has(e.id)) return;
      if (isBannerType(e.exception_type, e.severity)) return;
      const id = `ex:${e.id}`;
      if (toastedRef.current.has(id)) return;
      toastedRef.current.add(id);
      incoming.push({
        id,
        channel: "toast",
        source: "exception",
        type: e.exception_type,
        family: typeFamily(e.exception_type),
        severity: e.severity,
        title: titleFor(e.exception_type, e.severity),
        titleKey: titleKeyFor(e.exception_type, e.severity),
        body: bodyForException(e),
        count: 1,
        createdAt: Date.now(),
        canAck: false,
        exceptionId: e.id,
      });
    });
    enqueueToasts(incoming);
  }, [newIds, exceptions, enqueueToasts]);

  useEffect(() => {
    if (firstAlertsRef.current) {
      alerts.forEach((a) => toastedRef.current.add(`al:${a.id}`));
      firstAlertsRef.current = false;
      return;
    }
    const incoming: NotifyItem[] = [];
    alerts.forEach((a) => {
      if (a.is_resolved) return;
      const id = `al:${a.id}`;
      if (toastedRef.current.has(id)) return;
      toastedRef.current.add(id);
      const type = String(a.alert_type || a.type || "default");
      const severity = String(a.severity || "").toLowerCase();
      if (isBannerType(type, severity)) return;
      const localizedTitle = localizeBackendAlert(a.title, t);
      const accepted = Boolean(a.title && localizedTitle !== a.title);
      incoming.push({
        id,
        channel: "toast",
        source: "telemetry",
        type,
        family: typeFamily(type),
        severity: severity || "info",
        title: accepted ? localizedTitle : titleFor(type, severity),
        titleKey: accepted ? undefined : titleKeyFor(type, severity),
        body: accepted ? "" : bodyForAlert(a),
        count: 1,
        createdAt: Date.now(),
        canAck: false,
      });
    });
    enqueueToasts(incoming);
  }, [alerts, enqueueToasts]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return undefined;
    const w = window as Window & { __tfToastStorm?: () => void };
    w.__tfToastStorm = () => {
      const now = Date.now();
      enqueueToasts(
        Array.from({ length: 10 }, (_, i) => ({
          id: `storm-${now}-${i}`,
          channel: "toast" as const,
          source: "telemetry" as const,
          type: i < 5 ? "geofence" : "speed",
          family: i < 5 ? "geofence" : "speed",
          severity: "medium",
          title: titleFor(i < 5 ? "geofence" : "speed", "medium"),
          titleKey: titleKeyFor(i < 5 ? "geofence" : "speed", "medium"),
          body: `storm ${i + 1}`,
          count: 1,
          createdAt: now,
          canAck: false,
        }))
      );
    };
    return () => {
      delete w.__tfToastStorm;
    };
  }, [enqueueToasts]);

  const dismissBanner = useCallback((id: string) => {
    dismissedRef.current.add(id);
    setBanners((prev) => {
      const hit = prev.find((b) => b.id === id);
      if (hit) dismissedRef.current.add(`family:${hit.family}`);
      return prev.filter((b) => b.id !== id);
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const acknowledge = useCallback(
    async (item: NotifyItem) => {
      const exIds = item.exceptionIds?.length
        ? item.exceptionIds
        : item.exceptionId
          ? [item.exceptionId]
          : [];
      await Promise.all(exIds.map((id) => resolve(id, "acknowledge")));
      const alertIds = item.alertIds ?? [];
      await Promise.all(alertIds.map((id) => resolveAlert.mutateAsync({ id })));
      dismissBanner(item.id);
    },
    [resolve, resolveAlert, dismissBanner]
  );

  const notifyToast = useCallback(
    (opts: { type: string; title?: string; titleKey?: TranslationKey; body?: string; severity?: string }) => {
      enqueueToasts([
        {
          id: `form:${Date.now()}:${opts.type}`,
          channel: "toast",
          source: "telemetry",
          type: opts.type,
          family: typeFamily(opts.type),
          severity: opts.severity || "info",
          title: opts.title || "",
          titleKey: opts.titleKey,
          body: opts.body || "",
          count: 1,
          createdAt: Date.now(),
          canAck: false,
        },
      ]);
    },
    [enqueueToasts]
  );

  const toasts = toastQueue.slice(0, MAX_VISIBLE_TOASTS);

  const value = useMemo<Api>(
    () => ({
      banners,
      toasts,
      exceptions,
      loading,
      error,
      lastOkAt,
      newIds,
      refresh,
      resolve,
      dismissBanner,
      dismissToast,
      acknowledge,
      notifyToast,
    }),
    [
      banners,
      toasts,
      exceptions,
      loading,
      error,
      lastOkAt,
      newIds,
      refresh,
      resolve,
      dismissBanner,
      dismissToast,
      acknowledge,
      notifyToast,
    ]
  );

  return createElement(NotifyContext.Provider, { value }, children);
}

export function useNotifications(): Api {
  const ctx = useContext(NotifyContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}

export { MERGE_WINDOW_MS, MAX_VISIBLE_TOASTS, MAX_VISIBLE_BANNERS };
