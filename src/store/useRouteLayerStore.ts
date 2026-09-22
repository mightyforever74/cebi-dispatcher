import { create } from "zustand";

/**
 * BUG-4 v2 — Rota Katmanı Kontrol store'u (2026-08-02, Cem onaylı spec).
 *
 * Live Fleet Map'te rota Polyline'larının görünürlüğünü ve çift yönlü
 * hover-sync (harita ↔ sol panel) durumunu tutar.
 *
 * İLK AÇILIŞ VARSAYILANI (Cem kararı): showAllRoutes = false — sayfa
 * açıldığında yalnız araç ikonları görünür; rota katmanı kullanıcı
 * seçimiyle (global switch / plaka / sürücü) eklenir. 50-300 araçlık
 * hedef filoda "çizgi çorbası"nı önleyen dürüst UX budur.
 *
 * 0-DELAY ŞARTI: Zustand aboneliği — state değiştiği frame'de widget,
 * sidebar ve harita katmanı birlikte re-render olur; polling/refresh yok.
 *
 * Anahtar sözleşmesi: TÜM id'ler store'un araç anahtarı olan device_id'dir
 * (useVehicleStore ile aynı evren; activeRoutes de device_id anahtarlı).
 */

interface RouteLayerState {
  /** Global switch — Olasılık A: tüm aktif rotalar tek tıkla açılır/kapanır. */
  showAllRoutes: boolean;
  /** Olasılık B/C — plaka veya sürücü seçimiyle eklenen device_id kümesi. */
  selectedRouteVehicleIds: Record<string, true>;
  /** Hover-sync — haritada ya da sol panelde üzerine gelinen aracın device_id'si. */
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

/** Bir aracın rota katmanı görünür mü? (tek karar noktası — harita + widget aynı fonksiyonu kullanır) */
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
