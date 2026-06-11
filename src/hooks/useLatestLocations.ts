import { useEffect } from "react";
import { useAuthStore } from "store/useAuthStore";
import { LocationFrame, useVehicleStore } from "store/useVehicleStore";

interface LatestLocationsResponse {
  locations: LocationFrame[];
  count: number;
}

export function useLatestLocations(): void {
  const token = useAuthStore((state) => state.token);
  const applyLocationFrame = useVehicleStore((state) => state.applyLocationFrame);

  useEffect(() => {
    if (!token) {
      console.warn("[LOCATIONS] No token available, skipping fetch");
      return;
    }

    let active = true;
    const url = "https://enterprise-api.tulipfleet.com/api/dispatcher/locations/latest";

    async function fetchLatestLocations() {
      try {
        console.log(
          "[LOCATIONS] Fetching latest locations with token:",
          token.substring(0, 20) + "..."
        );
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("[LOCATIONS] Response status:", response.status);
        if (!active || !response.ok) {
          if (!response.ok) {
            const text = await response.text();
            console.error("[LOCATIONS] Failed to fetch:", { status: response.status, text });
          }
          return;
        }

        const payload = (await response.json()) as LatestLocationsResponse;
        const locations = payload?.locations;

        if (!active || !Array.isArray(locations)) {
          return;
        }

        locations.forEach((frame) => {
          applyLocationFrame({ ...frame, source: "rest" });
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("useLatestLocations: failed to fetch latest locations", error);
      }
    }

    fetchLatestLocations();

    return () => {
      active = false;
    };
  }, [applyLocationFrame, token]);
}
