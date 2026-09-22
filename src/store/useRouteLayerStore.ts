import { create } from "zustand";

/**
 * BUG-4 v2 — Rota Katmani Kontrol store'u (2026-08-02, Cem onayli spec).
 *
 * Live Fleet Map'te rota Polyline'larinin gorunurlugunu ve cift yonlu
 * hover-sync (harita ↔ sol panel) durumunu tutar.
 *
 * ILK ACILIS VARSAYILANI (Cem karari): showAllRoutes = false — sayfa
 * acildiginda yalniz arac ikonlari gorunur; rota katmani kullanici
 * secimiyle (global switch / plaka / surucu) eklenir. 50-300 araclik
 * hedef filoda "cizgi corbasi"ni onleyen durust UX budur.
 *
 * 0-DELAY SARTI: Zustand aboneligi — state degistigi frame'de widget,
 * sidebar ve harita katmani birlikte re-render olur; polling/refresh yok.
 *
 * Anahtar sozlesmesi: TUM id'ler store'un arac anahtari olan device_id'dir
 * (useVehicleStore ile ayni evren; activeRoutes de device_id anahtarli).
 */

interface RouteLayerState {
  /** Global switch — Olasilik A: tum aktif rotalar tek tikla acilir/kapanir. */
  showAllRoutes: boolean;
  /** Olasilik B/C — plaka veya surucu secimiyle eklenen device_id kumesi. */
  selectedRouteVehicleIds: Record<string, true>;
  /** Hover-sync — haritada ya da sol panelde uzerine gelinen aracin device_id'si. */
  hoveredVehicleId: string | null;
  toggleShowAll: () => void;
  toggleRouteVehicle: (deviceId: string) => void;
  clearRouteSelection: () => void;
  setHoveredVehicle: (deviceId: string | null) => void;
}

export const useRouteLayerStore = create<RouteLayerState>((set) => ({
  showAllRoutes: false,
  selectedRouteVehicleIds: {},
  hoveredVehicleId: null,

  toggleShowAll: () => set((s) => ({ showAllRoutes: !s.showAllRoutes })),

  toggleRouteVehicle: (deviceId) =>
    set((s) => {
      const next: Record<string, true> = { ...s.selectedRouteVehicleIds };
      if (next[deviceId]) {
        delete next[deviceId];
      } else {
        next[deviceId] = true;
      }
      return { selectedRouteVehicleIds: next };
    }),

  clearRouteSelection: () => set({ selectedRouteVehicleIds: {} }),

  setHoveredVehicle: (deviceId) => set({ hoveredVehicleId: deviceId }),
}));

/** Bir aracin rota katmani gorunur mu? (tek karar noktasi — harita + widget ayni fonksiyonu kullanir) */
export function isRouteVisible(
  state: Pick<RouteLayerState, "showAllRoutes" | "selectedRouteVehicleIds">,
  deviceId: string,
  selectedVehicleId: string | null
): boolean {
  return (
    state.showAllRoutes ||
    !!state.selectedRouteVehicleIds[deviceId] ||
    selectedVehicleId === deviceId
  );
}
