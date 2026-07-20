import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "store/useAuthStore";

// FIX (2026-07-18): HERE Discover proxy'sine (routes/geocode.js,
// tulipfleet-enterprise-backend) debounce'lu istek atan hook. Spec geregi:
// 300ms debounce, minimum 3 karakter, gereksiz HERE API cagrisi onlenir.

const ENTERPRISE_API_URL = "https://enterprise-api.tulipfleet.com";

export interface GeocodeResult {
  title: string;
  addressLabel: string;
  latitude: number;
  longitude: number;
}

export function useGeocodeSearch(query: string) {
  const token = useAuthStore((s) => s.token);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      fetch(
        `${ENTERPRISE_API_URL}/dispatcher/geocode/discover?q=${encodeURIComponent(trimmed)}`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
          signal: controller.signal,
        }
      )
        .then((res) => {
          if (!res.ok) throw new Error(`Geocode search failed: ${res.status}`);
          return res.json();
        })
        .then((data: { results: GeocodeResult[] }) => {
          setResults(data.results || []);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setResults([]);
          }
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, token]);

  return { results, loading };
}
