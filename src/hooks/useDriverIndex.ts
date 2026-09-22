/**
 * useDriverIndex — BUG-4 v2 Olasilik C (surucu adi bazli rota secimi) veri kaynagi.
 *
 * GET /api/dispatcher/drivers (enterprise, company-scoped, SELECT-only) tek kez
 * cekilir (token degisiminde yenilenir). Backend'e SIFIR dokunus — endpoint
 * zaten first_name/last_name + assigned_vehicle_id (public.vehicles.id UUID)
 * donduruyor (routes/drivers.js, kod kanitli).
 *
 * ATANMAMIS SURUCU GUARD'I (Cem duzeltmesi #1): assigned_vehicle_id NULL olan
 * ya da araci canli snapshot'ta bulunmayan (device eslesmesi yok) suruculer
 * secilemez — deviceId: null doner, UI "(Atanmamis)" etiketiyle disable eder.
 * Boylece set'e asla null/undefined sizmaz, "harita tepki vermiyor" algisi dogmaz.
 *
 * Esleme zinciri (kanitli): drivers.assigned_vehicle_id (UUID)
 *   → VehicleTelemetry.vehicle_id (snapshot'tan doldurulur)
 *   → store anahtari device_id (rota/marker evreni).
 */
import { useEffect, useMemo, useState } from "react";
import { ENTERPRISE_API_URL } from "config/api";
import { useT } from "i18n";
import { useAuthStore } from "store/useAuthStore";
import { useVehicleStore } from "store/useVehicleStore";
import { EMPTY_ARRAY } from "utils/empty";


interface ApiDriverRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  assigned_vehicle_id: string | null;
}

export interface DriverIndexEntry {
  driverId: string;
  name: string;
  /** Rota evrenindeki arac anahtari; null = secilemez (Atanmamis / arac canlida yok). */
  deviceId: string | null;
  plate: string | null;
}

export function useDriverIndex(): DriverIndexEntry[] {
  const { t } = useT();
  const token = useAuthStore((s) => s.token);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const [rows, setRows] = useState<ApiDriverRow[]>([]);

  useEffect(() => {
    let stopped = false;
    async function pull(): Promise<void> {
      try {
        const res = await fetch(`${ENTERPRISE_API_URL}/api/dispatcher/drivers`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (!res.ok) throw new Error(`drivers HTTP ${res.status}`);
        const data = await res.json();
        if (!stopped) setRows(data.drivers || EMPTY_ARRAY);
      } catch (e) {
        console.error("[driver-index]", e instanceof Error ? e.message : e);
      }
    }
    pull();
    return () => {
      stopped = true;
    };
  }, [token]);

  return useMemo(() => {
    // vehicle_id (UUID) → device_id (store anahtari) ters indeksi
    const byVehicleUuid: Record<string, { deviceId: string; plate: string }> = {};
    Object.values(vehicles).forEach((v) => {
      if (v.vehicle_id) byVehicleUuid[v.vehicle_id] = { deviceId: v.id, plate: v.plate };
    });

    return rows.map((r) => {
      const name =
        [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || t("map.unnamedDriver");
      const match = r.assigned_vehicle_id ? byVehicleUuid[r.assigned_vehicle_id] : undefined;
      return {
        driverId: r.id,
        name,
        deviceId: match ? match.deviceId : null,
        plate: match ? match.plate : null,
      };
    });
  }, [rows, vehicles, t]);
}
