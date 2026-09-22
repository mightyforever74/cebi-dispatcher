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
import { useAlerts, type Alert } from "hooks/useAlerts";
import {
  useExceptions,
  type ExceptionEvent,
  type ResolveAction,
} from "hooks/useExceptions";
import { t, type TranslationKey } from "i18n";
import { useAuthStore } from "store/useAuthStore";

const MERGE_WINDOW_MS = 10_000;
const MAX_VISIBLE_TOASTS = 3;

export type NotifyChannel = "banner" | "toast";

export interface NotifyItem {
  id: string;
  channel: NotifyChannel;
  source: "exception" | "telemetry";
  type: string;
  severity: string;
  title: string;
  body: string;
  count: number;
  createdAt: number;
  canAck: boolean;
  exceptionId?: string;
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

function titleFor(type: string, severity: string): string {
  const family = typeFamily(type);
  const exceptionKey = `status.exception.${family}` as TranslationKey;
  const exceptionLabel = t(exceptionKey);
  if (exceptionLabel !== exceptionKey) return exceptionLabel;
  const notifyKey = `notify.${family}` as TranslationKey;
  const notifyLabel = t(notifyKey);
  if (notifyLabel !== notifyKey) return notifyLabel;
  if (severity === "critical") return t("notify.bannerCritical");
  return type || t("notify.bannerCritical");
}

function bodyForException(e: ExceptionEvent): string {
  const p = e.detection_payload || {};
  const parts: string[] = [];
  if (p.task_no) parts.push(String(p.task_no));
  if (p.vehicle_plate) parts.push(String(p.vehicle_plate));
  return parts.join(" · ") || e.exception_type;
}

function bodyForAlert(a: Alert): string {
  return a.description || a.title || a.vehicle_plate || a.alert_type || a.type || a.id;
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
  const alerts = useMemo<Alert[]>(() => alertsData ?? [], [alertsData]);

  const [banners, setBanners] = useState<NotifyItem[]>([]);
  const [toastQueue, setToastQueue] = useState<NotifyItem[]>([]);
  const dismissedRef = useRef<Set<string>>(new Set());
  const toastedRef = useRef<Set<string>>(new Set());
  const firstAlertsRef = useRef(true);

  useEffect(() => {
    const next: NotifyItem[] = [];
    exceptions.forEach((e) => {
      if (e.status !== "open") return;
      if (!isBannerType(e.exception_type, e.severity)) return;
      const id = `ex:${e.id}`;
      if (dismissedRef.current.has(id)) return;
      next.push({
        id,
        channel: "banner",
        source: "exception",
        type: e.exception_type,
        severity: e.severity,
        title: titleFor(e.exception_type, e.severity),
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
      const id = `al:${a.id}`;
      if (dismissedRef.current.has(id)) return;
      next.push({
        id,
        channel: "banner",
        source: "telemetry",
        type,
        severity: severity || "critical",
        title: titleFor(type, severity || "critical"),
        body: bodyForAlert(a),
        count: 1,
        createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
        canAck: false,
      });
    });
    next.sort((a, b) => b.createdAt - a.createdAt);
    setBanners(next);
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
        severity: e.severity,
        title: titleFor(e.exception_type, e.severity),
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
      incoming.push({
        id,
        channel: "toast",
        source: "telemetry",
        type,
        severity: severity || "info",
        title: titleFor(type, severity),
        body: bodyForAlert(a),
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
          severity: "medium",
          title: titleFor(i < 5 ? "geofence" : "speed", "medium"),
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
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const acknowledge = useCallback(
    async (item: NotifyItem) => {
      if (item.exceptionId) {
        await resolve(item.exceptionId, "acknowledge");
      }
      dismissBanner(item.id);
    },
    [resolve, dismissBanner]
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

export { MERGE_WINDOW_MS, MAX_VISIBLE_TOASTS };
