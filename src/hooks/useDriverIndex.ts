/**
 * useDriverIndex — BUG-4 v2 Olasılık C (sürücü adı bazlı rota seçimi) veri kaynağı.
 *
 * GET /api/dispatcher/drivers (enterprise, company-scoped, SELECT-only) tek kez
 * çekilir (token değişiminde yenilenir). Backend'e SIFIR dokunuş — endpoint
 * zaten first_name/last_name + assigned_vehicle_id (public.vehicles.id UUID)
 * döndürüyor (routes/drivers.js, kod kanıtlı).
 *
 * ATANMAMIŞ SÜRÜCÜ GUARD'I (Cem düzeltmesi #1): assigned_vehicle_id NULL olan
 * ya da aracı canlı snapshot'ta bulunmayan (device eşleşmesi yok) sürücüler
 * seçilemez — deviceId: null döner, UI "(Atanmamış)" etiketiyle disable eder.
 * Böylece set'e asla null/undefined sızmaz, "harita tepki vermiyor" algısı doğmaz.
 *
 * Eşleme zinciri (kanıtlı): drivers.assigned_vehicle_id (UUID)
 *   → VehicleTelemetry.vehicle_id (snapshot'tan doldurulur)
 *   → store anahtarı device_id (rota/marker evreni).
 */
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "store/useAuthStore";
import { useVehicleStore } from "store/useVehicleStore";

const ENTERPRISE_API_URL = "https://enterprise-api.tulipfleet.com";

interface ApiDriverRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  assigned_vehicle_id: string | null;
}

export interface DriverIndexEntry {
  driverId: string;
  name: string;
  /** Rota evrenindeki araç anahtarı; null = seçilemez (Atanmamış / araç canlıda yok). */
  deviceId: string | null;
  plate: string | null;
}

export function useDriverIndex(): DriverIndexEntry[] {
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
        if (!stopped) setRows(data.drivers || []);
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
    // vehicle_id (UUID) → device_id (store anahtarı) ters indeksi
    const byVehicleUuid: Record<string, { deviceId: string; plate: string }> = {};
    Object.values(vehicles).forEach((v) => {
      if (v.vehicle_id) byVehicleUuid[v.vehicle_id] = { deviceId: v.id, plate: v.plate };
    });

    return rows.map((r) => {
      const name =
        [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || "İsimsiz sürücü";
      const match = r.assigned_vehicle_id ? byVehicleUuid[r.assigned_vehicle_id] : undefined;
      return {
        driverId: r.id,
        name,
        deviceId: match ? match.deviceId : null,
        plate: match ? match.plate : null,
      };
    });
  }, [rows, vehicles]);
}
