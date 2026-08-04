/**
 * useComplianceAssessment — Regulasyon Scorer'in veri kaynagi (04.08.2026).
 *
 * POST /api/compliance/assess (enterprise, 63d621a): dropoff koordinati →
 * ST_Contains zone cozumu + checkCompliance + dagontheffing sayaci +
 * calculateHeffing (distance_km verilirse). Tek round-trip, batch.
 * Sayfa, poll "completed" olunca cagirir; sonuc ScoringVehicleSnapshot.compliance
 * alanina beslenir — scorer SENKRON kalir (useDispatchLocationSnapshot deseni).
 * eu_hint: NL-bbox disi advisory (Avrupa Ipucu Katmani, Mode 1 — blok yok).
 */
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "store/useAuthStore";
import { ComplianceAssessRow } from "services/dispatch/scoring/types";

const ENTERPRISE_API_URL = "https://enterprise-api.tulipfleet.com";

export interface AssessZone {
  zone_id: string;
  city: string;
  zone_type: string;
}

export interface AssessResult {
  zone: AssessZone | null;
  eu_hint: string | null;
  byVehicle: Map<string, ComplianceAssessRow>;
}

interface AssessApiRow extends ComplianceAssessRow {
  vehicle_id: string;
  plate_no?: string;
}

export default function useComplianceAssessment(
  point: { lat: number; lng: number } | null,
  vehicleIds: string[],
  distanceKm: number | null
) {
  const token = useAuthStore((s) => s.token);
  return useQuery<AssessResult, Error>({
    queryKey: [
      "compliance-assess",
      point ? point.lat : null,
      point ? point.lng : null,
      vehicleIds.join(","),
      distanceKm,
    ],
    queryFn: async () => {
      const res = await fetch(`${ENTERPRISE_API_URL}/api/compliance/assess`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          point,
          vehicle_ids: vehicleIds,
          ...(distanceKm && distanceKm > 0 ? { distance_km: distanceKm } : {}),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`compliance assess failed: ${res.status} ${text}`);
      }
      const data = await res.json();
      const byVehicle = new Map<string, ComplianceAssessRow>();
      (data.results ?? []).forEach((r: AssessApiRow) => byVehicle.set(r.vehicle_id, r));
      return { zone: data.zone ?? null, eu_hint: data.eu_hint ?? null, byVehicle };
    },
    enabled: !!token && !!point && vehicleIds.length > 0,
    staleTime: 60_000,
    retry: 1,
  });
}
