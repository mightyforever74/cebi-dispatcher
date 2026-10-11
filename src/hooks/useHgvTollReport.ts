/**
 * useHgvTollReport — FEAT-008 FN-08's data source, "Reality Update" adapted
 * (Cem, 2026-10-11): FN-08 as originally spec'd reads enterprise.routing_jobs
 * .cost_breakdown JSONB, a column that was never built (same scope decision
 * as FN-09 — see tulipfleet-enterprise-backend/lib/buildHgvTollReport.js).
 * This hook instead calls the real, live GET /api/dispatcher/reports/hgv-toll
 * endpoint (FN-09), which computes the same numbers on the fly from
 * completed tasks.
 *
 * Plain fetch + useState/useEffect, not react-query — mirrors
 * useGeocodeSearch's pattern (which already has a working test harness in
 * this repo) rather than useComplianceAssessment's react-query pattern
 * (no QueryClientProvider test setup exists here yet). Both patterns are
 * already in use elsewhere in this codebase; this just follows the one with
 * an established, testable precedent, to avoid adding new test
 * infrastructure as a side effect of this feature.
 */
import { useEffect, useRef, useState } from "react";
import { ENTERPRISE_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";

export type HgvTollGroupBy = "vehicle" | "driver" | "day";

export interface HgvTollBreakdownRow {
  key: string;
  label: string;
  total_toll_eur: number;
  total_km: number;
  task_count: number;
  unmatched_count: number;
}

export interface HgvTollReport {
  period: { from: string | null; to: string | null };
  total_toll_eur: number;
  total_km: number;
  avg_eur_per_km: number | null;
  groupBy: HgvTollGroupBy;
  breakdown: HgvTollBreakdownRow[];
}

export interface UseHgvTollReportResult {
  data: HgvTollReport | null;
  isLoading: boolean;
  error: Error | null;
}

export function useHgvTollReport(
  from: string | null,
  to: string | null,
  groupBy: HgvTollGroupBy = "vehicle"
): UseHgvTollReportResult {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<HgvTollReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!token || !from || !to) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const thisRequest = ++requestId.current;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({ from, to, groupBy });

    fetch(`${ENTERPRISE_API_URL}/api/dispatcher/reports/hgv-toll?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`hgv-toll report failed: ${res.status} ${text}`);
        }
        return (await res.json()) as HgvTollReport;
      })
      .then((json) => {
        if (requestId.current === thisRequest) setData(json);
      })
      .catch((err: Error) => {
        if (requestId.current === thisRequest) setError(err);
      })
      .finally(() => {
        if (requestId.current === thisRequest) setIsLoading(false);
      });
  }, [token, from, to, groupBy]);

  return { data, isLoading, error };
}
