import { useState, useEffect, useRef } from "react";
import { ENTERPRISE_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";
import { EMPTY_ARRAY } from "utils/empty";

// FIX (2026-07-18): HERE Discover proxy'sine (routes/geocode.js,
// tulipfleet-enterprise-backend) debounce'lu istek atan hook. Spec geregi:
// 300ms debounce, minimum 3 karakter, gereksiz HERE API cagrisi onlenir.
//
// FIX (2026-10-10, "Waalhaven" geocoder tuzagi — SESSION_NOTES.md): optional
// bias center. Caller supplies it (fleet centroid for pickup, pickup point
// for dropoff) from data it already has (useDispatchLocationSnapshot) — this
// hook never queries locations itself; see INTEGRATION_BOUNDARIES.md (no
// enterprise_backend grant on public.locations) and ADR-grounded test
// test/geocode.bias.test.js (tulipfleet-enterprise-backend) for the backend
// half of this contract.

export interface GeocodeBias {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  title: string;
  addressLabel: string;
  latitude: number;
  longitude: number;
  city: string | null;
  postalCode: string | null;
  countryCode: string | null;
  distanceM: number | null;
}

/** "lat,lng" for the `at` query param, or null if biasAt is absent/non-finite. */
function biasAtParam(biasAt?: GeocodeBias | null): string | null {
  if (!biasAt) return null;
  const { latitude, longitude } = biasAt;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return `${latitude},${longitude}`;
}

export function useGeocodeSearch(query: string, biasAt?: GeocodeBias | null) {
  const token = useAuthStore((s) => s.token);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Primitive deps (not the `biasAt` object) so a caller re-rendering with a
  // same-value-but-new-reference object does not re-trigger the effect.
  const biasLat = biasAt?.latitude;
  const biasLng = biasAt?.longitude;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      const at = biasAtParam(biasAt);
      const url =
        `${ENTERPRISE_API_URL}/dispatcher/geocode/discover?q=${encodeURIComponent(trimmed)}` +
        (at ? `&at=${encodeURIComponent(at)}` : "");
      fetch(url, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Geocode search failed: ${res.status}`);
          return res.json();
        })
        .then((data: { results: GeocodeResult[] }) => {
          setResults(data.results || EMPTY_ARRAY);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setResults(EMPTY_ARRAY);
          }
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, token, biasLat, biasLng]);

  return { results, loading };
}
